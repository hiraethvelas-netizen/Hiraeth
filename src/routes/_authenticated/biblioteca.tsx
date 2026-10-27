import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";
import type { Tables } from "@/integrations/supabase/types";

type LibraryItem = Tables<"library_items"> & { products: Tables<"products"> | null };
type WishlistItem = Tables<"wishlist_items"> & { products: Tables<"products"> | null };

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Minha Biblioteca — Hiraeth" }] }),
  component: Biblioteca,
});

function Biblioteca() {
  const [pageSettings, savePageSettings] = useSiteContent("library-page-settings", { eyebrow: "Sua estante pessoal", title: "Minha Biblioteca", description: "Reúna sua coleção, acompanhe suas velas e guarde os próximos universos que deseja conhecer.", collectionLabel: "Minha coleção", wishlistLabel: "Meus desejos" });
  const [tab, setTab] = useState<"colecao" | "desejos">("colecao");
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grade" | "lista">("grade");

  // Form de item manual
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUserId(userData.user.id);
    const [{ data: lib }, { data: wish }] = await Promise.all([
      supabase.from("library_items").select("*, products(*)").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
      supabase.from("wishlist_items").select("*, products(*)").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    ]);
    setLibrary((lib as LibraryItem[]) ?? []);
    setWishlist((wish as WishlistItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProduct(product: Tables<"products">, values: Record<string, unknown>) {
    const payload = {
      name: String(values.name ?? product.name),
      description: String(values.description ?? "") || null,
      price: Number(values.price ?? product.price),
      sale_price: values.sale_price === "" || values.sale_price == null ? null : Number(values.sale_price),
      fragrance: String(values.fragrance ?? "") || null,
      images: Array.isArray(values.images) ? values.images as string[] : product.images,
    };
    const { error } = await supabase.from("products").update(payload).eq("id", product.id);
    if (error) throw error;
    setLibrary(current => current.map(item => item.product_id === product.id && item.products ? { ...item, products: { ...item.products, ...payload } } : item));
    setWishlist(current => current.map(item => item.product_id === product.id && item.products ? { ...item, products: { ...item.products, ...payload } } : item));
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase.from("library_items").insert({
      user_id: userId,
      custom_name: customName,
      acquired_at: acquiredAt || null,
      notes: notes || null,
    });
    if (error) {
      toast.error("Não foi possível adicionar.");
    } else {
      toast.success("Vela adicionada à sua estante.");
      setShowAdd(false);
      setCustomName("");
      setAcquiredAt("");
      setNotes("");
      load();
    }
  }

  async function toggleFavorite(item: LibraryItem) {
    await supabase.from("library_items").update({ favorite: !item.favorite }).eq("id", item.id);
    load();
  }

  async function removeLibraryItem(id: string) {
    await supabase.from("library_items").delete().eq("id", id);
    toast.success("Removido da estante.");
    load();
  }

  async function removeWish(id: string) {
    await supabase.from("wishlist_items").delete().eq("id", id);
    load();
  }

  async function moveToCollection(item: WishlistItem) {
    if (!userId) return;
    await supabase.from("library_items").insert({ user_id: userId, product_id: item.product_id });
    await supabase.from("wishlist_items").delete().eq("id", item.id);
    toast.success("Movido para sua coleção.");
    load();
  }

  const filteredLibrary = library.filter((i) => {
    if (!query) return true;
    const name = (i.products?.name ?? i.custom_name ?? "").toLowerCase();
    return name.includes(query.toLowerCase());
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
        <div className="mb-4 space-y-3">
          <InlineEditor label="página Minha Biblioteca e Favoritos" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "description", label: "Texto de apresentação", type: "textarea" }, { name: "collectionLabel", label: "Nome da aba da coleção", type: "text" }, { name: "wishlistLabel", label: "Nome da aba de favoritos/desejos", type: "text" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>
        <p className="eyebrow">{pageSettings.eyebrow}</p>
        <h1 className="mt-2 text-5xl text-foreground">{pageSettings.title}</h1>
        {pageSettings.description && <p className="mt-3 max-w-2xl text-muted-foreground">{pageSettings.description}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTab("colecao")}
            className={`border px-4 py-2 text-xs uppercase tracking-widest ${tab === "colecao" ? "border-primary text-primary" : "text-muted-foreground"}`}
          >
            {pageSettings.collectionLabel} ({library.length})
          </button>
          <button
            onClick={() => setTab("desejos")}
            className={`border px-4 py-2 text-xs uppercase tracking-widest ${tab === "desejos" ? "border-primary text-primary" : "text-muted-foreground"}`}
          >
            {pageSettings.wishlistLabel} ({wishlist.length})
          </button>
          <span className="flex-1" />
          <Link to="/pedidos" className="text-sm text-muted-foreground underline hover:text-primary">
            Meus pedidos
          </Link>
          <Link to="/configuracoes" className="text-sm text-muted-foreground underline hover:text-primary">
            Configurações da conta
          </Link>
        </div>

        {tab === "colecao" && (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                placeholder="Buscar na estante..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 border bg-transparent px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={() => setView(view === "grade" ? "lista" : "grade")} className="border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
                Ver como {view === "grade" ? "lista" : "grade"}
              </button>
              <button onClick={() => setShowAdd(!showAdd)} className="btn-gold justify-center">
                + Adicionar vela
              </button>
            </div>

            {showAdd && (
              <form onSubmit={addManual} className="mt-6 space-y-3 border bg-card p-6">
                <p className="font-display text-xl text-primary">Registrar uma vela antiga</p>
                <input
                  required
                  placeholder="Nome da vela"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full border bg-transparent px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <label className="block text-sm text-muted-foreground">
                  Data de aquisição (opcional)
                  <input
                    type="date"
                    value={acquiredAt}
                    onChange={(e) => setAcquiredAt(e.target.value)}
                    className="mt-1 w-full border bg-transparent px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <textarea
                  placeholder="Notas pessoais (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border bg-transparent px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button type="submit" className="btn-gold">Guardar na estante</button>
              </form>
            )}

            {loading ? (
              <p className="mt-12 text-center text-muted-foreground">Arrumando a estante...</p>
            ) : filteredLibrary.length === 0 ? (
              <div className="mt-12 text-center">
                <p className="font-display text-2xl italic text-primary">Sua estante aguarda a primeira vela</p>
                <p className="mt-2 text-muted-foreground">Adicione velas antigas ou explore a loja.</p>
                <Link to="/loja" className="btn-gold mt-6">Explorar a loja</Link>
              </div>
            ) : view === "grade" ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLibrary.map((item) => (
                  <div key={item.id} className="border bg-card p-5">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {item.products?.images?.[0] ? (
                        <img src={item.products.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display italic text-muted-foreground">✦</div>
                      )}
                    </div>
                    {item.products && <InlineEditor
                      label={`produto ${item.products.name}`}
                      fields={[
                        { name: "name", label: "Nome", type: "text" },
                        { name: "description", label: "Descrição", type: "textarea" },
                        { name: "price", label: "Preço", type: "text" },
                        { name: "sale_price", label: "Preço promocional", type: "text" },
                        { name: "fragrance", label: "Fragrância", type: "text" },
                        { name: "images", label: "Imagens", type: "images" },
                      ]}
                      values={{ name: item.products.name, description: item.products.description ?? "", price: String(item.products.price), sale_price: item.products.sale_price == null ? "" : String(item.products.sale_price), fragrance: item.products.fragrance ?? "", images: item.products.images ?? [] }}
                      onSave={(values) => saveProduct(item.products!, values)}
                    />}
                    <h3 className="mt-3 text-xl text-foreground">
                      {item.products ? (
                        <Link to="/produto/$slug" params={{ slug: item.products.slug }} className="hover:text-primary">
                          {item.products.name}
                        </Link>
                      ) : (
                        item.custom_name
                      )}
                    </h3>
                    {item.acquired_at && (
                      <p className="text-sm text-muted-foreground">Desde {new Date(item.acquired_at + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                    {item.notes && <p className="mt-2 text-sm italic text-foreground/80">{item.notes}</p>}
                    <div className="mt-3 flex gap-3 text-sm">
                      <button onClick={() => toggleFavorite(item)} className={item.favorite ? "text-primary" : "text-muted-foreground hover:text-primary"}>
                        {item.favorite ? "♥ Favorita" : "♡ Favoritar"}
                      </button>
                      <button onClick={() => removeLibraryItem(item.id)} className="text-muted-foreground hover:text-destructive">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="mt-8 divide-y">
                {filteredLibrary.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    <div className="flex-1">
                      <p className="text-xl text-foreground">
                        {item.products?.name ?? item.custom_name} {item.favorite && <span className="text-primary">♥</span>}
                      </p>
                      {item.notes && <p className="text-sm italic text-muted-foreground">{item.notes}</p>}
                    </div>
                    <button onClick={() => toggleFavorite(item)} className="text-sm text-muted-foreground hover:text-primary">
                      {item.favorite ? "Desfavoritar" : "Favoritar"}
                    </button>
                    <button onClick={() => removeLibraryItem(item.id)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "desejos" && (
          <>
            {wishlist.length === 0 ? (
              <div className="mt-12 text-center">
                <p className="font-display text-2xl italic text-primary">Nenhum desejo guardado</p>
                <p className="mt-2 text-muted-foreground">Use o coração nas páginas de produto.</p>
                <Link to="/loja" className="btn-gold mt-6">Explorar a loja</Link>
              </div>
            ) : (
              <ul className="mt-8 divide-y">
                {wishlist.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden border bg-muted">
                      {item.products?.images?.[0] && <img src={item.products.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      {item.products ? (
                        <Link to="/produto/$slug" params={{ slug: item.products.slug }} className="text-xl text-foreground hover:text-primary">
                          {item.products.name}
                        </Link>
                      ) : (
                        <p className="text-xl text-muted-foreground">Produto indisponível</p>
                      )}
                      {item.products && <InlineEditor
                      label={`produto ${item.products.name}`}
                      fields={[
                        { name: "name", label: "Nome", type: "text" },
                        { name: "description", label: "Descrição", type: "textarea" },
                        { name: "price", label: "Preço", type: "text" },
                        { name: "sale_price", label: "Preço promocional", type: "text" },
                        { name: "fragrance", label: "Fragrância", type: "text" },
                        { name: "images", label: "Imagens", type: "images" },
                      ]}
                      values={{ name: item.products.name, description: item.products.description ?? "", price: String(item.products.price), sale_price: item.products.sale_price == null ? "" : String(item.products.sale_price), fragrance: item.products.fragrance ?? "", images: item.products.images ?? [] }}
                      onSave={(values) => saveProduct(item.products!, values)}
                    />}
                      {item.products && (
                        <p className="text-sm text-muted-foreground">
                          {item.products.stock > 0 ? `${brl(Number(item.products.sale_price ?? item.products.price))} · disponível` : "Indisponível no momento"}
                        </p>
                      )}
                    </div>
                    {item.products && (
                      <button onClick={() => moveToCollection(item)} className="text-sm text-muted-foreground underline hover:text-primary">
                        Mover para coleção
                      </button>
                    )}
                    <button onClick={() => removeWish(item.id)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
