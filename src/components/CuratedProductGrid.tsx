import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Flame } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;
export type DisplaySize = "normal" | "large";
export type FeaturedProduct = { id: string; size: DisplaySize };
type Curation = {
  title: string;
  configured: boolean;
  featured: FeaturedProduct[];
  [key: string]: unknown;
};

type Props = {
  scope: string;
  products: Product[];
  categories: Category[];
  wishlistIds: Set<string>;
  onWishlist: (productId: string, event: React.MouseEvent) => void;
  onSaveProduct: (product: Product, values: Record<string, unknown>) => Promise<void>;
  showFavorites?: boolean;
  searching?: boolean;
};

/** One instance per collection. Every category and subcategory has its own curation. */
export function CuratedProductGrid({
  scope, products, categories, wishlistIds, onWishlist, onSaveProduct,
  showFavorites = false, searching = false,
}: Props) {
  const { isAdmin, editMode } = useAdminEdit();
  const fallbackTitle = scope === "home" ? "Chamas em Evidência" : "Tesouros deste Universo";
  const [settings, saveSettings] = useSiteContent<Curation>("store-curation-" + scope, {
    title: fallbackTitle, configured: false, featured: [],
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Curation>(settings);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const productMap = new Map(products.map(product => [product.id, product]));
  const edited = settings.featured.filter(item => productMap.has(item.id));
  // With no curation configured yet, keep every previously published product visible.
  // Search/favorites always show matching products even if not in the curated selection.
  const visible = searching || showFavorites || !settings.configured
    ? products.map(product => ({ product, size: edited.find(item => item.id === product.id)?.size ?? "normal" as DisplaySize }))
    : edited.map(item => ({ product: productMap.get(item.id)!, size: item.size }));
  const searchResults = products.filter(p => p.name.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR")));
  const badgeText = (badge: string | null | undefined) =>
    badge === "limited" ? "Edição limitada" : badge === "bestseller" ? "Mais vendido" : badge ? "Novidade" : "";

  function begin() {
    setDraft({
      title: settings.title || fallbackTitle,
      configured: true,
      featured: settings.configured
        ? [...settings.featured]
        : products.map(p => ({ id: p.id, size: "normal" })),
    });
    setEditing(true);
    setFilter("");
  }
  function toggle(id: string) {
    setDraft(previous => ({
      ...previous,
      featured: previous.featured.some(item => item.id === id)
        ? previous.featured.filter(item => item.id !== id)
        : [...previous.featured, { id, size: "normal" }],
    }));
  }
  function updateSize(id: string, size: DisplaySize) {
    setDraft(previous => ({
      ...previous, featured: previous.featured.map(item => item.id === id ? { ...item, size } : item),
    }));
  }
  function move(id: string, direction: -1 | 1) {
    setDraft(previous => {
      const copy = [...previous.featured];
      const index = copy.findIndex(item => item.id === id);
      const to = index + direction;
      if (index < 0 || to < 0 || to >= copy.length) return previous;
      [copy[index], copy[to]] = [copy[to]!, copy[index]!];
      return { ...previous, featured: copy };
    });
  }
  async function save() {
    setSaving(true);
    try {
      await saveSettings({ ...draft, title: draft.title.trim() || fallbackTitle, configured: true });
      setEditing(false);
      toast.success("Vitrine do Acervo atualizada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar os destaques.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 min-w-0" aria-label={settings.title || fallbackTitle}>
      {!showFavorites && !searching && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Uma seleção para você</p>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">{settings.title || fallbackTitle}</h2>
          </div>
          {isAdmin && editMode && (
            <button type="button" onClick={begin}
              className="rounded border border-primary/40 px-3 py-2 text-xs text-primary">
              Escolher velas e tamanhos
            </button>
          )}
        </div>
      )}
      {isAdmin && editMode && editing && (
        <div className="mb-8 rounded-xl border border-primary/40 bg-card p-4" aria-label="Editar vitrine de produtos">
          <h3 className="font-display text-xl text-foreground">Organizar chamas em evidência</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha quais produtos aparecem nesta página e o tamanho de cada um.
            Na fileira normal cabem três velas; o destaque maior ocupa o espaço de quatro.
          </p>
          <label className="mt-4 block text-sm text-foreground">Nome da seção
            <input value={draft.title} onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2" />
          </label>
          <label className="mt-3 block text-sm text-foreground">Pesquisar produto cadastrado
            <input type="search" value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Buscar vela pelo nome..." className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2" />
          </label>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {searchResults.map(product => {
              const selected = draft.featured.find(item => item.id === product.id);
              const index = draft.featured.findIndex(item => item.id === product.id);
              return <div key={product.id} className="flex min-w-0 flex-wrap items-center gap-2 border-b border-primary/15 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!selected} onChange={() => toggle(product.id)} />
                  {product.images?.[0] && <img src={product.images[0]} className="h-10 w-10 shrink-0 object-contain" alt="" />}
                  <span className="min-w-0 break-words">{product.name}</span>
                </label>
                {selected && <>
                  <select value={selected.size} onChange={e => updateSize(product.id, e.target.value as DisplaySize)}
                    aria-label={"Tamanho na vitrine: " + product.name}
                    className="max-w-32 rounded border border-primary/30 bg-background px-2 py-2 text-xs text-foreground">
                    <option value="normal">Fileira (3)</option>
                    <option value="large">Destaque maior</option>
                  </select>
                  <button type="button" disabled={index === 0} onClick={() => move(product.id, -1)}
                    className="px-2 text-primary disabled:opacity-30" aria-label={"Mover " + product.name + " para cima"}>↑</button>
                  <button type="button" disabled={index === draft.featured.length - 1} onClick={() => move(product.id, 1)}
                    className="px-2 text-primary disabled:opacity-30" aria-label={"Mover " + product.name + " para baixo"}>↓</button>
                </>}
              </div>;
            })}
            {searchResults.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{draft.featured.length} produto(s) selecionado(s) nesta vitrine.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={saving}
              className="btn-gold disabled:opacity-50">{saving ? "Salvando..." : "Salvar vitrine"}</button>
            <button type="button" disabled={saving} onClick={() => setEditing(false)}
              className="rounded border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}
      {visible.length === 0 ? <p className="py-8 text-center font-display italic text-muted-foreground">
        {settings.configured ? "Nenhuma chama selecionada para esta vitrine." : "Novas chamas chegarão em breve."}
      </p> : (
        <div className="grid min-w-0 grid-cols-3 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-8 md:gap-x-6" data-testid="curated-product-grid">
          {visible.map(({ product: p, size }) => {
            const isLarge = size === "large" && !searching && !showFavorites;
            const badge = (p as Product & { product_badge?: string | null }).product_badge;
            const temporary = categories.some(cat => cat.id === p.category_id &&
              (cat.is_temporary || categories.some(parent => parent.id === cat.parent_id && parent.is_temporary)));
            return <Link key={p.id} to="/produto/$slug" params={{ slug: p.slug }}
              className={"hiraeth-product-card group relative block min-w-0 bg-transparent text-center transition-transform duration-300 " +
                (isLarge ? "col-span-2 row-span-2 hiraeth-featured-flame" : "")}
              data-product-badge={badge ?? undefined} data-product-size={size}>
              <div className={"hiraeth-product-visual relative overflow-hidden bg-transparent " +
                (isLarge ? "aspect-[4/5] sm:aspect-square" : "aspect-square")}>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name}
                    className="hiraeth-product-image h-full w-full object-contain p-1 transition-transform duration-700 group-hover:scale-[1.06] sm:p-3"
                    loading="lazy" />
                ) : <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground">Foto em breve</div>}
                <button type="button" onClick={e => onWishlist(p.id, e)}
                  aria-label={wishlistIds.has(p.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  aria-pressed={wishlistIds.has(p.id)}
                  className="absolute right-0.5 top-0.5 z-10 rounded-full bg-[#f5efe5]/90 p-1 text-[#68764f] shadow-sm sm:right-3 sm:top-3 sm:p-2">
                  <Heart size={isLarge ? 20 : 14} strokeWidth={1.8}
                    fill={wishlistIds.has(p.id) ? "currentColor" : "none"} />
                </button>
                {badge && <span className="hiraeth-product-badge absolute left-1 top-1 z-10 rounded-full bg-[#65744d] px-1.5 py-1 text-[8px] uppercase text-[#f7efda] sm:left-3 sm:top-3 sm:px-3">{badgeText(badge)}</span>}
              </div>
              <div className="px-0.5 pb-2 pt-2 sm:px-2 sm:pt-3">
                {temporary && <p className="mb-1 text-[9px] text-primary">Edição temporária</p>}
                <InlineEditor label={"produto " + p.name}
                  fields={[
                    { name: "name", label: "Nome", type: "text" },
                    { name: "description", label: "Descrição", type: "textarea" },
                    { name: "price", label: "Preço", type: "text" },
                    { name: "sale_price", label: "Preço promocional", type: "text" },
                    { name: "fragrance", label: "Fragrância", type: "text" },
                    { name: "images", label: "Imagens do produto", type: "images" },
                  ]}
                  values={{ name: p.name, description: p.description ?? "", price: String(p.price),
                    sale_price: p.sale_price == null ? "" : String(p.sale_price), fragrance: p.fragrance ?? "",
                    images: p.images ?? [] }}
                  onSave={values => onSaveProduct(p, values)} />
                <h3 className={"font-display break-words font-medium leading-snug text-foreground " +
                  (isLarge ? "text-xl sm:text-3xl" : "text-xs sm:text-lg")}>{p.name}</h3>
                <div className={"mt-1 flex flex-wrap items-baseline justify-center gap-1 text-primary " + (isLarge ? "text-xl" : "text-xs sm:text-base")}>
                  <span>{brl(Number(p.sale_price ?? p.price))}</span>
                  {p.sale_price != null && <span className="text-[10px] text-muted-foreground line-through">{brl(Number(p.price))}</span>}
                </div>
              </div>
            </Link>;
          })}
        </div>
      )}
    </section>
  );
}
