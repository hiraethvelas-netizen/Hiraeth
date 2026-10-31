import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";
import { CandleBookshelf, type CandleDraftInput, type CandleLibraryItem } from "@/components/CandleBookshelf";
import type { Tables } from "@/integrations/supabase/types";

type LibraryItem = CandleLibraryItem & { product_id?: string | null };
type WishlistItem = Tables<"wishlist_items"> & { products: Tables<"products"> | null };

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Minha Biblioteca — Hiraeth" }] }),
  component: Biblioteca,
});

function Biblioteca() {
  const [pageSettings, savePageSettings] = useSiteContent("library-page-settings", {
    eyebrow: "Sua estante pessoal",
    title: "Minha Biblioteca",
    description: "Reúna sua coleção, acompanhe suas velas e guarde os próximos universos que deseja conhecer.",
    collectionLabel: "Minha coleção",
    wishlistLabel: "Meus desejos",
  });
  const [tab, setTab] = useState<"colecao" | "desejos">("colecao");
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    setUserId(userData.user.id);
    const [{ data: lib, error: libraryError }, { data: wish, error: wishlistError }] = await Promise.all([
      (supabase as any).from("community_library").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
      supabase.from("wishlist_items").select("*, products(*)").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    ]);
    if (libraryError) toast.error("Não foi possível carregar sua estante.");
    if (wishlistError) toast.error("Não foi possível carregar seus desejos.");
    setLibrary((lib ?? []) as LibraryItem[]);
    setWishlist((wish ?? []) as WishlistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function uploadCandlePhoto(file: File | null) {
    if (!file) return null;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      throw new Error("Escolha uma foto JPG, PNG, WebP ou GIF de até 8 MB.");
    }
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `public/library-${userId}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("review-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
  }

  async function addManual(values: CandleDraftInput) {
    if (!userId) throw new Error("Entre na sua conta para adicionar uma vela.");
    const image_url = await uploadCandlePhoto(values.image);
    const { error } = await (supabase as any).from("community_library").insert({
      user_id: userId,
      title: values.title,
      aroma: values.aroma.trim() || null,
      category: values.category.trim() || null,
      acquired_at: values.acquired_at || null,
      notes: values.notes.trim() || null,
      rating: values.rating || null,
      image_url,
    });
    if (error) throw error;
    toast.success("Sua vela antiga agora faz parte da estante.");
    await load();
  }

  async function updateCandle(id: string, values: CandleDraftInput) {
    if (!userId) throw new Error("Entre na sua conta para editar a estante.");
    const current = library.find(item => item.id === id);
    if (!current) throw new Error("Esta vela não foi encontrada.");
    if (current.order_item_id && current.purchase_status !== "delivered") {
      throw new Error("Os detalhes e a avaliação ficam disponíveis quando o pedido for marcado como entregue.");
    }
    const uploadedImage = await uploadCandlePhoto(values.image);
    const { error } = await (supabase as any).from("community_library").update({
      title: values.title,
      aroma: values.aroma.trim() || null,
      category: values.category.trim() || null,
      acquired_at: values.acquired_at || null,
      notes: values.notes.trim() || null,
      rating: values.rating || null,
      ...(uploadedImage ? { image_url: uploadedImage } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", userId);
    if (error) throw error;
    toast.success("Detalhes da vela atualizados.");
    await load();
  }

  async function toggleFavorite(item: CandleLibraryItem) {
    if (!userId) return;
    const { error } = await (supabase as any).from("community_library").update({ favorite: !item.favorite }).eq("id", item.id).eq("user_id", userId);
    if (error) { toast.error("Não foi possível atualizar seus favoritos."); return; }
    await load();
  }

  async function removeLibraryItem(item: CandleLibraryItem) {
    if (!userId || item.order_item_id) return;
    const { error } = await (supabase as any).from("community_library").delete().eq("id", item.id).eq("user_id", userId);
    if (error) throw error;
    toast.success("Vela removida da estante.");
    await load();
  }

  async function removeWish(id: string) {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover este desejo.");
    await load();
  }

  async function moveToCollection(item: WishlistItem) {
    if (!userId || !item.products) return;
    const { error } = await (supabase as any).from("community_library").insert({
      user_id: userId,
      product_id: item.product_id,
      title: item.products.name,
      aroma: item.products.fragrance ?? null,
      image_url: item.products.images?.[0] ?? null,
    });
    if (error) { toast.error("Não foi possível mover para sua coleção."); return; }
    const { error: removeError } = await supabase.from("wishlist_items").delete().eq("id", item.id);
    if (removeError) toast.error("A vela foi adicionada, mas não foi possível retirar o desejo.");
    else toast.success("Movida para sua coleção.");
    await load();
  }

  async function saveProduct(product: Tables<"products">, values: Record<string, unknown>) {
    const payload = {
      name: String(values["name"] ?? product.name),
      description: String(values["description"] ?? "") || null,
      price: Number(values["price"] ?? product.price),
      sale_price: values["sale_price"] === "" || values["sale_price"] == null ? null : Number(values["sale_price"]),
      fragrance: String(values["fragrance"] ?? "") || null,
      images: Array.isArray(values["images"]) ? values["images"] as string[] : product.images,
    };
    const { error } = await supabase.from("products").update(payload).eq("id", product.id);
    if (error) throw error;
    setWishlist(current => current.map(item => item.product_id === product.id && item.products ? { ...item, products: { ...item.products, ...payload } } : item));
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-12">
        <div className="mb-3">
          <InlineEditor label="página Minha Biblioteca e Favoritos" fields={[
            { name: "eyebrow", label: "Texto pequeno acima do título", type: "text" },
            { name: "title", label: "Título da página", type: "text" },
            { name: "description", label: "Texto de apresentação", type: "textarea" },
            { name: "collectionLabel", label: "Nome da aba da coleção", type: "text" },
            { name: "wishlistLabel", label: "Nome da aba de favoritos/desejos", type: "text" },
          ]} values={pageSettings} onSave={async next => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>
        <p className="eyebrow">{pageSettings.eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl text-foreground sm:text-5xl">{pageSettings.title}</h1>
        {pageSettings.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pageSettings.description}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-primary/20 pb-4">
          <button type="button" onClick={() => setTab("colecao")} className={`border px-4 py-2 text-xs uppercase tracking-widest ${tab === "colecao" ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"}`}>
            {pageSettings.collectionLabel} ({library.length})
          </button>
          <button type="button" onClick={() => setTab("desejos")} className={`border px-4 py-2 text-xs uppercase tracking-widest ${tab === "desejos" ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"}`}>
            {pageSettings.wishlistLabel} ({wishlist.length})
          </button>
          <span className="flex-1" />
          <Link to="/pedidos" className="text-sm text-muted-foreground underline hover:text-primary">Meus pedidos</Link>
          <Link to="/configuracoes" search={{ tab: "perfil" }} className="text-sm text-muted-foreground underline hover:text-primary">Configurações da conta</Link>
        </div>

        {tab === "colecao" && (
          <section className="mt-5">
            {loading
              ? <p className="py-12 text-center text-muted-foreground">Arrumando sua estante...</p>
              : <CandleBookshelf items={library} editable onAdd={addManual} onUpdate={updateCandle} onFavorite={toggleFavorite} onRemove={removeLibraryItem} />}
          </section>
        )}

        {tab === "desejos" && (
          wishlist.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="font-display text-2xl italic text-primary">Nenhum desejo guardado</p>
              <p className="mt-2 text-muted-foreground">Use o coração nas páginas de produto.</p>
              <Link to="/loja" className="btn-gold mt-6">Explorar a loja</Link>
            </div>
          ) : (
            <ul className="mt-8 divide-y">
              {wishlist.map(item => (
                <li key={item.id} className="flex items-center gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden border bg-muted">
                    {item.products?.images?.[0] && <img src={item.products.images[0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.products
                      ? <Link to="/produto/$slug" params={{ slug: item.products.slug }} className="text-xl text-foreground hover:text-primary">{item.products.name}</Link>
                      : <p className="text-xl text-muted-foreground">Produto indisponível</p>}
                    {item.products && <InlineEditor label={`produto ${item.products.name}`} fields={[
                      { name: "name", label: "Nome", type: "text" },
                      { name: "description", label: "Descrição", type: "textarea" },
                      { name: "price", label: "Preço", type: "text" },
                      { name: "sale_price", label: "Preço promocional", type: "text" },
                      { name: "fragrance", label: "Fragrância", type: "text" },
                      { name: "images", label: "Imagens", type: "images" },
                    ]} values={{ name: item.products.name, description: item.products.description ?? "", price: String(item.products.price), sale_price: item.products.sale_price == null ? "" : String(item.products.sale_price), fragrance: item.products.fragrance ?? "", images: item.products.images ?? [] }} onSave={values => saveProduct(item.products!, values)} />}
                    {item.products && <p className="text-sm text-muted-foreground">{item.products.stock > 0 ? `${brl(Number(item.products.sale_price ?? item.products.price))} · disponível` : "Indisponível no momento"}</p>}
                  </div>
                  {item.products && <button type="button" onClick={() => void moveToCollection(item)} className="text-sm text-muted-foreground underline hover:text-primary">Mover para coleção</button>}
                  <button type="button" onClick={() => void removeWish(item.id)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
                </li>
              ))}
            </ul>
          )
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
