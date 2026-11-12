import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MAX_PORTAL_FEATURED_PRODUCTS, portalFeaturedProductIds, updatePortalFeaturedProducts } from "@/lib/portal-featured-products";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Props = { themeJson: string; onChange: (json: string) => void };

export function PortalFeaturedProductsEditor({ themeJson, onChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");
  const theme = useMemo(() => {
    try { return JSON.parse(themeJson || "{}") as unknown; } catch { return null; }
  }, [themeJson]);
  const selectedIds = portalFeaturedProductIds(theme);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: loadError } = await supabase.from("products").select("*")
        .eq("status", "published").order("name");
      if (!active) return;
      setError(Boolean(loadError));
      setProducts((data ?? []).filter(product => !product.product_type || product.product_type === "candle"));
      setLoading(false);
    })().catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, []);

  function save(ids: string[]) {
    if (theme === null) return;
    onChange(JSON.stringify(updatePortalFeaturedProducts(theme, ids), null, 2));
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) save(selectedIds.filter(item => item !== id));
    else if (selectedIds.length < MAX_PORTAL_FEATURED_PRODUCTS) save([...selectedIds, id]);
  }
  function move(id: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(id), target = index + direction;
    if (index < 0 || target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    save(next);
  }

  const options = products.filter(product =>
    product.name.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR")));
  const byId = new Map(products.map(product => [product.id, product]));
  return <section className="relative z-10 rounded-xl border border-primary/35 bg-card p-4 md:p-5" aria-label="Selecionar velas em destaque do Portal NFC">
    <h3 className="font-display text-2xl text-foreground">Velas em destaque no Portal NFC</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
      Escolha até cinco velas publicadas para a vitrine de velas soltas ao final do Mundo da Magia.
      A ordem selecionada aqui será a ordem do carrossel. Sem seleção, aparecem até cinco velas publicadas recentes.
      Para publicar suas escolhas, salve o portal.
    </p>
    <p className="mt-3 text-sm font-medium text-primary" role="status">{selectedIds.length} de {MAX_PORTAL_FEATURED_PRODUCTS} velas selecionadas</p>
    {selectedIds.length > 0 && <div className="mt-3 space-y-2" aria-label="Ordem das velas escolhidas">
      {selectedIds.map((id, index) => {
        const product = byId.get(id);
        return <div key={id} className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 p-2">
          <span className="text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
          {product?.images?.[0] && <img src={product.images[0]} alt="" className="h-12 w-10 rounded object-contain" />}
          <span className="min-w-0 flex-1 text-sm text-foreground">{product?.name ?? "Vela indisponível"}</span>
          <button type="button" onClick={() => move(id, -1)} disabled={index === 0} aria-label={"Mover " + (product?.name ?? id) + " à esquerda"} className="rounded border border-primary/30 px-2 py-1 text-sm disabled:opacity-30">←</button>
          <button type="button" onClick={() => move(id, 1)} disabled={index === selectedIds.length - 1} aria-label={"Mover " + (product?.name ?? id) + " à direita"} className="rounded border border-primary/30 px-2 py-1 text-sm disabled:opacity-30">→</button>
          <button type="button" onClick={() => toggle(id)} className="rounded border border-destructive/35 px-2 py-1 text-sm text-destructive">Remover</button>
        </div>;
      })}
    </div>}
    <label className="mt-4 block text-sm text-foreground">Encontrar vela publicada
      <input type="search" value={filter} onChange={event => setFilter(event.target.value)}
        placeholder="Pesquise pelo nome..." className="mt-2 w-full rounded border border-primary/30 bg-background px-3 py-2 text-foreground" />
    </label>
    {loading ? <p className="mt-4 text-sm text-muted-foreground">Carregando velas...</p>
      : error ? <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível carregar as velas publicadas.</p>
        : <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {options.map(product => {
            const checked = selectedIds.includes(product.id);
            return <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded border border-primary/20 p-2 text-sm text-foreground">
              <input type="checkbox" checked={checked}
                disabled={!checked && selectedIds.length >= MAX_PORTAL_FEATURED_PRODUCTS}
                onChange={() => toggle(product.id)} />
              {product.images?.[0] && <img src={product.images[0]} alt="" className="h-11 w-10 object-contain" />}
              <span className="min-w-0 flex-1">{product.name}</span>
            </label>;
          })}
          {options.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhuma vela publicada corresponde à pesquisa.</p>}
        </div>}
    {theme === null && <p role="alert" className="mt-3 text-sm text-destructive">Corrija o JSON nas configurações avançadas para editar a vitrine.</p>}
  </section>;
}
