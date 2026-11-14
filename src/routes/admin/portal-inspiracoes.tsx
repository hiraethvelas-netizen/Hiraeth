import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import entreFiosPhoto from "@/assets/natal-entre-fios-recorte.webp";
import grandeSalaoPhoto from "@/assets/natal-grande-salao-recorte.webp";

type Fragment = Tables<"portal_fragments">;
type Portal = Tables<"portals">;
type StoryDraft = { title: string; reference: string; body: string; context: string };

const positions = [3, 4, 5, 6, 8, 9] as const;
const fallbackPhotos: Partial<Record<number, string>> = {
  3: "/portal-casa-leao.avif",
  4: "/portal-casa-texugo.avif",
  6: "/portal-casa-aguia.avif",
  8: entreFiosPhoto,
  9: grandeSalaoPhoto,
};
export const Route = createFileRoute("/admin/portal-inspiracoes")({
  head: () => ({ meta: [{ title: "Fotos e textos do Portal NFC — Hiraeth" }] }),
  component: PortalInspiracoesAdmin,
});

export function PortalInspiracoesAdmin({ portalId }: { portalId?: string } = {}) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [cropping, setCropping] = useState<{ position: number; source: File | string | null } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<StoryDraft>({ title: "", reference: "", body: "", context: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const portalQuery = supabase.from("portals").select("*");
    const { data: p, error: portalError } = await (portalId
      ? portalQuery.eq("id", portalId)
      : portalQuery.eq("slug", "o-mundo-de-magia")).maybeSingle();
    if (portalError || !p) {
      toast.error("Não foi possível localizar o Portal O Mundo da Magia.");
      setLoading(false);
      return;
    }
    const { data: items, error: fragmentError } = await supabase.from("portal_fragments")
      .select("*").eq("portal_id", p.id).order("position");
    if (fragmentError) {
      toast.error("Não foi possível carregar as inspirações do portal.");
    } else {
      setPortal(p);
      setFragments(items ?? []);
    }
    setLoading(false);
  }, [portalId]);

  useEffect(() => { void load(); }, [load]);

  async function sendPhoto(position: number, file: File) {
    const fragment = fragments.find(item => item.position === position);
    if (!portal || !fragment) throw new Error("Não foi possível localizar a fotografia desta inspiração.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Escolha um arquivo PNG, JPG ou WebP.");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 10 MB.");
    }
    setUploading(position);
    try {
      const clean = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      const key = "inspiracoes/" + portal.id + "/" + crypto.randomUUID() + "-" + clean;
      const bucket = supabase.storage.from("product-images");
      const { error: uploadError } = await bucket.upload(key, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = bucket.getPublicUrl(key);
      if (!data.publicUrl) throw new Error("Não foi possível obter o endereço da foto.");
      const { error: saveError } = await supabase.from("portal_fragments")
        .update({ image_url: data.publicUrl, caption: fragment.title }).eq("id", fragment.id);
      if (saveError) throw saveError;
      setFragments(items => items.map(item => item.id === fragment.id
        ? { ...item, image_url: data.publicUrl, caption: fragment.title } : item));
      toast.success("Fotografia atualizada no Portal NFC.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar a foto.");
      throw error;
    } finally {
      setUploading(null);
    }
  }

  function openPhotoEditor(fragment: Fragment) {
    setCropping({
      position: fragment.position,
      source: fragment.image_url || fallbackPhotos[fragment.position] || null,
    });
  }

  function chooseCropFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Escolha um arquivo PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10 MB.");
      return;
    }
    setCropping(current => current ? { ...current, source: file } : null);
  }

  async function saveCroppedPhoto(file: File) {
    if (!cropping) throw new Error("Escolha uma fotografia antes de salvar.");
    await sendPhoto(cropping.position, file);
    setCropping(null);
  }

  function openText(fragment: Fragment) {
    setEditing(fragment.position);
    setDraft({
      title: fragment.title,
      reference: fragment.reference ?? "",
      body: fragment.body,
      context: fragment.context ?? "",
    });
  }

  async function saveText(fragment: Fragment) {
    if (!draft.body.trim() || !draft.title.trim()) {
      toast.error("Preencha o título e o texto.");
      return;
    }
    setSaving(true);
    const values = {
      title: draft.title.trim(), reference: draft.reference.trim() || null,
      body: draft.body.trim(), context: draft.context.trim() || null,
    };
    const { error } = await supabase.from("portal_fragments").update(values).eq("id", fragment.id);
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar os textos."); return; }
    setFragments(items => items.map(item => item.id === fragment.id ? { ...item, ...values } : item));
    setEditing(null);
    toast.success("Texto do Natal salvo.");
  }

  const intro = fragments.find(fragment => fragment.position === 7);
  const candleFragments = positions.map(position => fragments.find(item => item.position === position)).filter(
    (item): item is Fragment => Boolean(item),
  );

  return <div className="space-y-8">
    {!portalId && <header>
      <p className="text-xs uppercase tracking-[.2em] text-primary">Portal NFC · Mundo da Magia</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">Fotografias e histórias</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Troque as fotos das quatro polaroids e das duas velas natalinas com seus arquivos originais.
        O portal usa a imagem enviada sem reduzir a resolução ou alterar os rótulos.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link to="/admin/portais" className="text-primary underline underline-offset-4">Voltar aos portais</Link>
        <a href="/portal/o-mundo-de-magia/inspiracoes" className="text-primary underline underline-offset-4">Ver inspirações</a>
      </div>
    </header>}

    {loading ? <p role="status">Carregando fotografias...</p> : !portal ? <p role="alert">Portal não encontrado.</p> : <>
      <section aria-labelledby="photos-houses-title">
        <h2 id="photos-houses-title" className="font-display text-2xl">Polaroids das casas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A moldura listrada e o nome da casa ficam no site. Envie somente a fotografia original das velas.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {candleFragments.filter(item => item.position <= 6).map(fragment => (
            <article key={fragment.id} className="border bg-card p-4">
              <div className="mx-auto w-full max-w-48 border bg-[#f7efda] p-2 pb-4">
                <div className="aspect-square overflow-hidden bg-[#dcd3c2]">
                  {fragment.image_url || fallbackPhotos[fragment.position] ?
                    <img src={fragment.image_url || fallbackPhotos[fragment.position]} alt={fragment.title}
                      className="h-full w-full object-cover" /> :
                    <div className="grid h-full place-items-center text-center text-xs text-[#665844]">Foto em breve</div>}
                </div>
                <p className="mt-3 text-center font-serif text-base text-[#4a3328]">{fragment.title}</p>
              </div>
              <button type="button" disabled={uploading !== null}
                aria-label={"Editar foto da polaroid " + fragment.title}
                onClick={() => photoInputs.current[fragment.position]?.click()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
                <Pencil size={16} aria-hidden="true" />
                {uploading === fragment.position ? "Enviando foto..." : "Editar foto da polaroid"}
              </button>
              <input ref={element => { photoInputs.current[fragment.position] = element; }}
                type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null}
                aria-label={"Trocar foto de " + fragment.title} className="sr-only"
                onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void sendPhoto(fragment.position, file);
                }} />
              <p className="mt-2 text-xs text-muted-foreground">{fragment.image_url ? "Foto personalizada em uso" : "Foto padrão ou aguardando envio"}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="photos-christmas-title" className="border-t pt-8">
        <h2 id="photos-christmas-title" className="font-display text-2xl">Edição de Natal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          As velas natalinas são exibidas sem polaroid, com fundo transparente e os textos editáveis.
          Para preservar a transparência, prefira PNG ou WebP com canal alfa.
        </p>
        {intro && <article className="mt-5 border bg-card p-4">
          <h3 className="font-display text-xl">Texto de abertura do Natal</h3>
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{intro.body}</p>
          <button type="button" className="mt-3 text-sm font-medium text-primary underline underline-offset-4"
            onClick={() => openText(intro)}>Editar texto de abertura</button>
          {editing === 7 && <StoryForm fragment={intro} draft={draft} setDraft={setDraft}
            saving={saving} onSave={() => void saveText(intro)} onCancel={() => setEditing(null)} />}
        </article>}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {candleFragments.filter(item => item.position >= 8).map(fragment => (
            <article key={fragment.id} className="border bg-card p-4 sm:p-6">
              <div className="mx-auto grid h-56 max-w-xs place-items-center">
                <img src={fragment.image_url || fallbackPhotos[fragment.position]} alt={fragment.title}
                  className="h-full max-w-full object-contain" />
              </div>
              <h3 className="mt-3 text-center font-display text-xl">{fragment.title}</h3>
              <button type="button" disabled={uploading !== null}
                aria-label={"Editar foto da vela " + fragment.title}
                onClick={() => photoInputs.current[fragment.position]?.click()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
                <Pencil size={16} aria-hidden="true" />
                {uploading === fragment.position ? "Enviando foto..." : "Editar foto da vela"}
              </button>
              <input ref={element => { photoInputs.current[fragment.position] = element; }}
                type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null}
                aria-label={"Trocar foto de " + fragment.title} className="sr-only"
                onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void sendPhoto(fragment.position, file);
                }} />
              <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{fragment.body}</p>
              <button type="button" onClick={() => openText(fragment)}
                className="mt-3 text-sm font-medium text-primary underline underline-offset-4">
                Editar história e aroma
              </button>
              {editing === fragment.position && <StoryForm fragment={fragment} draft={draft} setDraft={setDraft}
                saving={saving} onSave={() => void saveText(fragment)} onCancel={() => setEditing(null)} />}
            </article>
          ))}
        </div>
      </section>
    </>}
  </div>;
}

function StoryForm({ fragment, draft, setDraft, saving, onSave, onCancel }: {
  fragment: Fragment; draft: StoryDraft; setDraft: (next: StoryDraft) => void;
  saving: boolean; onSave: () => void; onCancel: () => void;
}) {
  const intro = fragment.position === 7;
  return <form className="mt-5 space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); onSave(); }}>
    {!intro && <label className="block text-sm">Nome da vela
      <input className="mt-1 w-full border bg-background px-3 py-2" required value={draft.title}
        onChange={event => setDraft({ ...draft, title: event.target.value })} />
    </label>}
    {!intro && <label className="block text-sm">Frase curta / referência
      <textarea rows={2} className="mt-1 w-full border bg-background px-3 py-2" value={draft.reference}
        onChange={event => setDraft({ ...draft, reference: event.target.value })} />
    </label>}
    {intro && <p className="text-xs text-muted-foreground">
      O primeiro parágrafo aparece no destaque vermelho da página de inspirações. O texto completo permanece salvo.
    </p>}
    <label className="block text-sm">{intro ? "Texto de abertura" : "História da vela"}
      <textarea rows={intro ? 4 : 8} className="mt-1 w-full border bg-background px-3 py-2" required
        value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} />
    </label>
    {!intro && <label className="block text-sm">Aroma / contexto
      <textarea rows={2} className="mt-1 w-full border bg-background px-3 py-2" value={draft.context}
        onChange={event => setDraft({ ...draft, context: event.target.value })} />
    </label>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={saving} className="btn-gold">{saving ? "Salvando..." : "Salvar texto"}</button>
      <button type="button" onClick={onCancel} className="border px-4 py-2 text-sm">Cancelar</button>
    </div>
  </form>;
}
