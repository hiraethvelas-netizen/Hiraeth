import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Banner = { id: string; title: string | null; image_url: string; href: string; position: number; active: boolean };
const blank = { title: "", image_url: "", href: "/loja", position: 1, active: true };

export const Route = createFileRoute("/admin/banners")({ component: BannersAdmin });

function BannersAdmin() {
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await (supabase as any).from("site_banners").select("*").order("position", { ascending: true });
    if (error) setMessage("Não foi possível carregar os banners. Verifique se a migração do banco foi aplicada: " + error.message);
    else setItems(data ?? []);
  }
  useEffect(() => { void load(); }, []);

  function edit(item: Banner) {
    setEditing(item.id);
    setForm({ title: item.title ?? "", image_url: item.image_url, href: item.href, position: item.position, active: item.active });
    setFile(null);
    setMessage("");
  }
  function reset() {
    setEditing(null);
    setForm({ ...blank, position: items.length + 1 });
    setFile(null);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage("");
    try {
      let imageUrl = form.image_url.trim();
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
        if (file.size > 5 * 1024 * 1024) throw new Error("A imagem precisa ter no máximo 5 MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("site-banners").upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("site-banners").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      if (!imageUrl) throw new Error("Escolha uma imagem do celular ou computador.");
      const payload = { title: form.title.trim() || null, image_url: imageUrl, href: form.href.trim(), position: Number(form.position), active: form.active, updated_at: new Date().toISOString() };
      const result = editing
        ? await (supabase as any).from("site_banners").update(payload).eq("id", editing)
        : await (supabase as any).from("site_banners").insert(payload);
      if (result.error) throw result.error;
      setMessage("Banner salvo com sucesso.");
      reset();
      await load();
    } catch (err) {
      setMessage("Não foi possível salvar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally { setBusy(false); }
  }

  async function remove(item: Banner) {
    if (!window.confirm(`Excluir o banner "${item.title || "sem título"}"?`)) return;
    const { error } = await (supabase as any).from("site_banners").delete().eq("id", item.id);
    setMessage(error ? "Erro ao excluir: " + error.message : "Banner excluído.");
    if (!error) { if (editing === item.id) reset(); await load(); }
  }
  async function toggle(item: Banner) {
    const { error } = await (supabase as any).from("site_banners").update({ active: !item.active }).eq("id", item.id);
    setMessage(error ? "Erro ao alterar visibilidade: " + error.message : "Visibilidade atualizada.");
    if (!error) await load();
  }

  return <div className="space-y-8">
    <header><p className="text-xs uppercase tracking-[0.25em] text-primary">Página inicial</p><h1 className="mt-2 font-display text-4xl text-foreground">Banners do Círculo</h1><p className="mt-3 max-w-2xl text-muted-foreground">Gerencie os banners horizontais de “Novidades do Círculo”. Escolha a imagem diretamente do celular ou computador; não é necessário colar links. JPG, PNG ou WebP, até 5 MB. O título é opcional.</p></header>
    {message && <p role="status" className="border border-primary/30 p-4 text-sm">{message}</p>}
    <section className="border p-5 md:p-7">
      <h2 className="font-display text-2xl">{editing ? "Editar banner" : "Adicionar banner"}</h2>
      <form onSubmit={save} className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm">Título (opcional)<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="Ex.: Um novo portal te espera" /></label>
        <label className="grid gap-2 text-sm">Link de destino<input required value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="/loja ou /produto/nome" /></label>
        <label className="grid gap-2 text-sm md:col-span-2">Imagem do banner<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full border bg-transparent px-3 py-3 file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" /><span className="text-xs text-muted-foreground">Escolha uma imagem do celular ou computador (JPG, PNG ou WebP, até 5 MB). Ao editar, se não selecionar outra imagem, a atual será mantida.</span>{file && <span className="text-xs text-muted-foreground">Arquivo selecionado: {file.name}</span>}</label>
        <label className="grid gap-2 text-sm">Ordem de exibição<input required type="number" min="1" value={form.position} onChange={e => setForm({ ...form, position: Number(e.target.value) })} className="border bg-transparent px-3 py-3" /></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Exibir na página inicial</label>
        {(file || form.image_url) && <div className="md:col-span-2"><p className="mb-2 text-xs text-muted-foreground">Prévia</p><img src={file ? URL.createObjectURL(file) : form.image_url} alt="Prévia do banner" className="max-h-48 w-full rounded-sm object-cover" /></div>}
        <div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" disabled={busy} className="bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{busy ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar banner"}</button><button type="button" onClick={reset} className="border px-5 py-3">Limpar formulário</button></div>
      </form>
    </section>
    <section className="space-y-4"><h2 className="font-display text-2xl">Banners cadastrados</h2>
      {items.length === 0 ? <p className="text-muted-foreground">Nenhum banner cadastrado ainda.</p> : items.map(item => <article key={item.id} className="flex flex-col gap-4 border p-4 md:flex-row md:items-center"><img src={item.image_url} alt="" className="h-24 w-full rounded-sm object-cover md:w-48" /><div className="min-w-0 flex-1"><h3 className="font-display text-xl">{item.title || "Banner sem título"}</h3><p className="break-all text-sm text-muted-foreground">{item.href}</p><p className="mt-1 text-xs text-muted-foreground">Posição {item.position} · {item.active ? "Visível" : "Oculto"}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => edit(item)} className="border px-3 py-2 text-sm">Editar</button><button onClick={() => void toggle(item)} className="border px-3 py-2 text-sm">{item.active ? "Ocultar" : "Exibir"}</button><button onClick={() => void remove(item)} className="border border-destructive/50 px-3 py-2 text-sm">Excluir</button></div></article>)}
    </section>
  </div>;
}
