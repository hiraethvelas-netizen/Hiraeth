import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";
import { CandleBookshelf, type CandleDraftInput, type CandleLibraryItem } from "@/components/CandleBookshelf";

type LibraryItem = CandleLibraryItem & { product_id?: string | null };

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
  });
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    setUserId(userData.user.id);
    const { data: lib, error: libraryError } = await (supabase as any).from("community_library")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    if (libraryError) toast.error("Não foi possível carregar sua estante.");
    setLibrary((lib ?? []) as LibraryItem[]);
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
    if (!values.image) throw new Error("Adicione uma foto da vela para registrar uma coleção antiga.");
    const { data: purchaseMatches, error: duplicateError } = await (supabase as any).from("community_library")
      .select("id,acquired_at")
      .eq("user_id", userId)
      .ilike("title", values.title.trim())
      .not("order_item_id", "is", null)
      .limit(20);
    if (duplicateError) throw duplicateError;
    const duplicatePurchase = (purchaseMatches ?? []).some((purchase: { acquired_at: string | null }) => !values.acquired_at || purchase.acquired_at === values.acquired_at);
    if (duplicatePurchase) throw new Error("Essa vela já aparece na sua Biblioteca por uma compra da loja. Abra o registro existente para completar seus detalhes após a entrega.");
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
    const uploadedImage = current.order_item_id ? null : await uploadCandlePhoto(values.image);
    const payload = current.order_item_id
      ? {
          notes: values.notes.trim() || null,
          rating: values.rating || null,
          updated_at: new Date().toISOString(),
        }
      : {
          title: values.title,
          aroma: values.aroma.trim() || null,
          category: values.category.trim() || null,
          acquired_at: values.acquired_at || null,
          notes: values.notes.trim() || null,
          rating: values.rating || null,
          ...(uploadedImage ? { image_url: uploadedImage } : {}),
          updated_at: new Date().toISOString(),
        };
    const { error } = await (supabase as any).from("community_library").update(payload).eq("id", id).eq("user_id", userId);
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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        <div className="mb-3">
          <InlineEditor label="página Minha Biblioteca e Favoritos" fields={[
            { name: "eyebrow", label: "Texto pequeno acima do título", type: "text" },
            { name: "title", label: "Título da página", type: "text" },
            { name: "description", label: "Texto de apresentação", type: "textarea" },
            { name: "collectionLabel", label: "Nome da aba da coleção", type: "text" },
          ]} values={pageSettings} onSave={async next => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>
        <p className="eyebrow">{pageSettings.eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl text-foreground sm:text-5xl">{pageSettings.title}</h1>
        {pageSettings.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pageSettings.description}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-primary/20 pb-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{pageSettings.collectionLabel} ({library.length})</span>
        </div>

        <section className="mt-5">
          {loading
            ? <p className="py-12 text-center text-muted-foreground">Arrumando sua estante...</p>
            : <CandleBookshelf items={library} editable onAdd={addManual} onUpdate={updateCandle} onFavorite={toggleFavorite} onRemove={removeLibraryItem} />}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
