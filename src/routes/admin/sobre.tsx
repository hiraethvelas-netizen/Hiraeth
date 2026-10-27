import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string; instagram_url: string; whatsapp_number: string; whatsapp_url: string; contact_email: string };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "", instagram_url: "", whatsapp_number: "", whatsapp_url: "", contact_email: "" };

export const Route = createFileRoute("/admin/sobre")({ component: AdminSobre });
function AdminSobre() {
  const [form, setForm] = useState<Profile>(defaults);
  const [aboutFile, setAboutFile] = useState<File | null>(null);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  useEffect(() => { void (async () => { const { data, error } = await (supabase as any).from("site_profile").select("*").eq("id", true).maybeSingle(); if (data) setForm({ ...defaults, ...data }); setMessage(error ? "Não foi possível carregar. Confira se a migração site_profile foi aplicada." : ""); })(); }, []);
  async function upload(file: File | null, current: string, prefix: string) {
    if (!file) return current;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Use JPG, PNG, WebP ou GIF.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Cada imagem deve ter até 10 MB.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `profile/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-banners").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("site-banners").getPublicUrl(path).data.publicUrl;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const about_image_url = await upload(aboutFile, form.about_image_url, "mari");
      const story_image_url = await upload(storyFile, form.story_image_url, "historia");
      const payload = { ...form, about_image_url, story_image_url, id: true, updated_at: new Date().toISOString() };
      const { error } = await (supabase as any).from("site_profile").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setForm({ ...form, about_image_url, story_image_url }); setAboutFile(null); setStoryFile(null); setMessage("Informações salvas. A página Sobre e o rodapé foram atualizados.");
    } catch (err) { setMessage("Não foi possível salvar: " + (err instanceof Error ? err.message : "erro desconhecido")); }
    finally { setSaving(false); }
  }
  const field = (label: string, key: keyof Profile, placeholder = "") => <label className="grid gap-2 text-sm">{label}<input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="border bg-transparent px-3 py-3" /></label>;
  const imageField = (label: string, current: string, setFile: (f: File | null) => void, file: File | null) => <label className="grid gap-2 text-sm">{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} className="border bg-transparent px-3 py-3" /><span className="text-xs text-muted-foreground">Escolha uma imagem do aparelho (até 10 MB).</span>{(file || current) && <img src={file ? URL.createObjectURL(file) : current} alt={label} className="max-h-48 w-auto object-cover" />}</label>;
  return <div className="space-y-6"><div><p className="text-xs uppercase tracking-widest text-primary">Conteúdo do site</p><h1 className="mt-2 text-4xl">Sobre a Hiraeth e contatos</h1><p className="mt-2 text-muted-foreground">Edite a história, sua apresentação, fotos e canais oficiais. Os contatos também aparecem no rodapé do site.</p></div>{message && <p role="status" className="border border-primary/30 p-3 text-sm">{message}</p>}<form onSubmit={save} className="grid gap-5 border p-5 md:grid-cols-2"><label className="grid gap-2 text-sm md:col-span-2">A história da Hiraeth<textarea rows={6} value={form.about_story} onChange={e => setForm({ ...form, about_story: e.target.value })} className="border bg-transparent px-3 py-3" /></label>{imageField("Imagem da história / começo da Hiraeth", form.story_image_url, setStoryFile, storyFile)}<label className="grid gap-2 text-sm">Sobre a Mari, Guardiã da Chama<textarea rows={6} value={form.about_mari} onChange={e => setForm({ ...form, about_mari: e.target.value })} className="border bg-transparent px-3 py-3" /></label>{imageField("Sua foto", form.about_image_url, setAboutFile, aboutFile)}<div className="md:col-span-2"><h2 className="text-xl">Contatos do rodapé</h2><p className="mt-1 text-xs text-muted-foreground">Preencha apenas os canais que deseja exibir.</p></div>{field("Link do Instagram", "instagram_url", "https://instagram.com/sua_marca")}{field("Número do WhatsApp com código do país", "whatsapp_number", "5547999999999")}{field("Link do WhatsApp (opcional)", "whatsapp_url", "https://wa.me/5547999999999")}{field("E-mail de contato", "contact_email", "contato@hiraeth.com.br")}<div className="md:col-span-2"><button disabled={saving} className="bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button></div></form></div>;
}
