import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;
type FragmentForm = {
  title: string;
  body: string;
  reference: string;
  context: string;
  image_url: string;
  caption: string;
  visible: boolean;
  position: number;
};

const emptyForm: FragmentForm = {
  title: "",
  body: "",
  reference: "",
  context: "",
  image_url: "",
  caption: "",
  visible: true,
  position: 0,
};

const inputClass =
  "w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

export function PortalFragmentsEditor({ portalId }: { portalId: string }) {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FragmentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("portal_fragments")
      .select("*")
      .eq("portal_id", portalId)
      .order("position", { ascending: true });
    if (error) {
      toast.error("Não foi possível carregar os conteúdos do portal.");
    } else {
      setFragments(data ?? []);
    }
    setLoading(false);
  }, [portalId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyForm, position: fragments.length });
    setShowForm(true);
  }

  function startEdit(fragment: Fragment) {
    setEditingId(fragment.id);
    setForm({
      title: fragment.title,
      body: fragment.body,
      reference: fragment.reference ?? "",
      context: fragment.context ?? "",
      image_url: fragment.image_url ?? "",
      caption: fragment.caption ?? "",
      visible: fragment.visible,
      position: fragment.position,
    });
    setShowForm(true);
  }

  async function uploadPhoto(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Envie uma foto JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A foto deve ter até 10 MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const safeName = file.name.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `inspiracoes/${portalId}/${crypto.randomUUID()}-${safeName}`;
      // Use the existing admin-enabled image bucket, without changing storage policies.
      const bucket = supabase.storage.from("product-images");
      const { error } = await bucket.upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = bucket.getPublicUrl(path);
      if (!data.publicUrl) throw new Error("Não foi possível obter o link da foto.");
      setForm(current => ({
        ...current,
        image_url: data.publicUrl,
        caption: current.caption || current.title,
      }));
      toast.success("Foto enviada. Salve o conteúdo para exibi-la no portal.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadingPhoto) { toast.error("Conclua o envio da foto antes de salvar."); return; }
    setSaving(true);
    const payload = {
      portal_id: portalId,
      title: form.title.trim(),
      body: form.body.trim(),
      reference: form.reference.trim() || null,
      context: form.context.trim() || null,
      image_url: form.image_url.trim() || null,
      caption: form.caption.trim() || null,
      visible: form.visible,
      position: Number(form.position) || 0,
    };
    const result = editingId
      ? await supabase.from("portal_fragments").update(payload).eq("id", editingId)
      : await supabase.from("portal_fragments").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error("Não foi possível salvar este conteúdo. Verifique as permissões.");
      return;
    }
    toast.success(editingId ? "Conteúdo atualizado." : "Conteúdo adicionado ao portal.");
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function remove(fragment: Fragment) {
    if (!window.confirm(`Excluir "${fragment.title}" deste portal?`)) return;
    const { error } = await supabase.from("portal_fragments").delete().eq("id", fragment.id);
    if (error) {
      toast.error("Não foi possível excluir este conteúdo.");
      return;
    }
    toast.success("Conteúdo removido.");
    await load();
  }

  return (
    <section className="mt-8 border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Conteúdo interno</p>
          <h2 className="mt-1 text-2xl text-foreground">Imagens e fragmentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Edite os textos e envie fotos das velas atuais ou antigas diretamente nesta área, sem mexer no layout.</p>
        </div>
        <button type="button" onClick={startNew} className="btn-gold">+ Adicionar conteúdo</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mt-5 space-y-4 border p-4">
          <h3 className="text-lg text-primary">{editingId ? "Editar conteúdo" : "Novo conteúdo"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted-foreground">Título *
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm text-muted-foreground">Referência / origem
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Livro, capítulo ou inspiração" className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm text-muted-foreground md:col-span-2">Texto *
              <textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm text-muted-foreground md:col-span-2">Contexto / história da inspiração
              <textarea rows={3} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <div className="text-sm text-muted-foreground md:col-span-2">
              <label className="block">Enviar foto da vela ou da inspiração
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || uploadingPhoto}
                  aria-label="Enviar foto da inspiração"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void uploadPhoto(file);
                  }}
                  className={`mt-1 ${inputClass}`} />
              </label>
              <p className="mt-1 text-xs">Escolha uma foto real de cada casa, da Seletora ou das velas antigas (até 10 MB).</p>
              {uploadingPhoto && <p role="status" className="mt-2 text-primary">Enviando foto...</p>}
              {form.image_url && <div className="mt-3 flex flex-wrap items-end gap-3">
                <img src={form.image_url} alt="Prévia da foto cadastrada" className="h-40 w-40 rounded border object-contain" />
                <button type="button" disabled={uploadingPhoto || saving}
                  onClick={() => setForm(current => ({ ...current, image_url: "", caption: "" }))}
                  className="rounded border border-destructive/50 px-3 py-2 text-xs text-destructive">
                  Remover foto deste conteúdo
                </button>
              </div>}
            </div>
            <label className="text-sm text-muted-foreground md:col-span-2">Ou cole a URL de uma foto existente
              <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm text-muted-foreground">Legenda da imagem
              <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm text-muted-foreground">Ordem
              <input type="number" min="0" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} className={`mt-1 ${inputClass}`} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
            Mostrar este conteúdo no portal publicado
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || uploadingPhoto} className="btn-gold">{saving ? "Salvando..." : "Salvar conteúdo"}</button>
            <button type="button" disabled={uploadingPhoto} onClick={() => setShowForm(false)} className="border px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <p className="mt-5 text-sm text-muted-foreground">Carregando conteúdos...</p> : fragments.length === 0 ? (
        <p className="mt-5 border border-dashed p-5 text-sm text-muted-foreground">Nenhuma imagem ou fragmento cadastrado. Use “Adicionar conteúdo” para montar este portal.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {fragments.map((fragment) => (
            <article key={fragment.id} className="flex flex-col gap-3 border p-4 sm:flex-row">
              {fragment.image_url && <img src={fragment.image_url} alt={fragment.caption ?? fragment.title} className="h-24 w-full object-cover sm:w-28" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg text-foreground">{fragment.title}</h3>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{fragment.visible ? "Visível" : "Oculto"}</span>
                </div>
                {fragment.reference && <p className="text-xs italic text-muted-foreground">{fragment.reference}</p>}
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{fragment.body}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => startEdit(fragment)} className="text-primary">Editar</button>
                <button type="button" onClick={() => void remove(fragment)} className="text-destructive">Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
