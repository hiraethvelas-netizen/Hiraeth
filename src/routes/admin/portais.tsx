import type { Json } from "@/integrations/supabase/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import { PortalFragmentsEditor } from "@/components/admin/PortalFragmentsEditor";
import type { Tables } from "@/integrations/supabase/types";

type Portal = Tables<"portals">;
type Category = Tables<"categories">;

export const Route = createFileRoute("/admin/portais")({
  head: () => ({ meta: [{ title: "Portais NFC — Admin Hiraeth" }] }),
  component: AdminPortais,
});

const emptyForm = {
  name: "",
  universe: "",
  cover_url: "",
  intro_title: "Seja bem-vindo ao mundo de magia",
  intro_subtitle: "",
  intro_video_url: "",
  intro_cta_text: "Atravesse o Portal",
  store_category_url: "/loja",
  intro_enabled: true,
  intro_duration_ms: 3000,
  spotify_playlist_url: "",
  spotify_title: "",
  spotify_description: "",
  spotify_visible: true,
  status: "draft",
  theme_json: '{ "palette": { "background": "#17251d", "surface": "#26382d", "text": "#f5edda", "accent": "#c6a65b", "buttonText": "#17251d" }, "carousel_items": [] }',
};

function AdminPortais() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Portal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: categoryData }] = await Promise.all([
      supabase.from("portals").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("visible", true).order("position"),
    ]);
    setCategories((categoryData ?? []) as Category[]);
    if (error) {
      setLoadError(true);
      toast.error("Não foi possível carregar os portais.");
    } else {
      setLoadError(false);
      setPortals(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function publicUrl(p: Portal) {
    return `${window.location.origin}/portal/${p.slug}`;
  }

  async function copyLink(p: Portal) {
    try {
      await navigator.clipboard.writeText(publicUrl(p));
      setCopiedId(p.id);
      toast.success("Link NFC copiado! Cole no aplicativo de gravação da tag.");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Abra o portal e copie o link manualmente.");
    }
  }

  function startEdit(p: Portal) {
    setEditing(p);
    setForm({
      name: p.name,
      universe: p.universe ?? "",
      cover_url: p.cover_url ?? "",
      intro_title: p.intro_title ?? "",
      intro_subtitle: p.intro_subtitle ?? "",
      intro_video_url: p.intro_video_url ?? "",
      intro_cta_text: p.intro_cta_text ?? "Atravesse o Portal",
      store_category_url: p.store_category_url ?? "/loja",
      intro_enabled: p.intro_enabled,
      intro_duration_ms: p.intro_duration_ms,
      spotify_playlist_url: p.spotify_playlist_url ?? "",
      spotify_title: p.spotify_title ?? "",
      spotify_description: p.spotify_description ?? "",
      spotify_visible: p.spotify_visible,
      status: p.status,
      theme_json: JSON.stringify(p.theme ?? {}, null, 2),
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      universe: form.universe || null,
      cover_url: form.cover_url || null,
      intro_title: form.intro_title || null,
      intro_subtitle: form.intro_subtitle || null,
      intro_video_url: form.intro_video_url || null,
      intro_cta_text: form.intro_cta_text.trim() || "Atravesse o Portal",
      store_category_url: form.store_category_url.trim() || "/loja",
      intro_enabled: form.intro_enabled,
      intro_duration_ms: Number(form.intro_duration_ms) || 3000,
      spotify_playlist_url: form.spotify_playlist_url || null,
      spotify_title: form.spotify_title || null,
      spotify_description: form.spotify_description || null,
      spotify_visible: form.spotify_visible,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    let parsedTheme: Json;
    try { parsedTheme = JSON.parse(form.theme_json || "{}"); }
    catch { toast.error("O JSON do tema está inválido. Revise a paleta e os itens do carrossel."); return; }
    const safePayload = { ...payload, theme: parsedTheme };
    const { error } = editing
      ? await supabase.from("portals").update(safePayload).eq("id", editing.id)
      : await supabase.from("portals").insert({ ...safePayload, slug: slugify(form.name) });
    if (error) {
      toast.error(error.message.includes("unique") ? "Já existe um portal com esse nome." : "Erro ao salvar.");
    } else {
      toast.success(editing ? "Portal atualizado." : "Portal criado.");
      setShowForm(false);
      load();
    }
  }

  async function duplicate(p: Portal) {
    const { error } = await supabase.from("portals").insert({
      name: `${p.name} (cópia)`,
      slug: `${p.slug}-copia-${Date.now().toString(36)}`,
      universe: p.universe,
      category: p.category,
      cover_url: p.cover_url,
      intro_title: p.intro_title,
      intro_subtitle: p.intro_subtitle,
      intro_video_url: p.intro_video_url,
      intro_cta_text: p.intro_cta_text,
      store_category_url: p.store_category_url,
      intro_enabled: p.intro_enabled,
      intro_duration_ms: p.intro_duration_ms,
      spotify_playlist_url: p.spotify_playlist_url,
      spotify_title: p.spotify_title,
      spotify_description: p.spotify_description,
      spotify_visible: p.spotify_visible,
      theme: p.theme,
      status: "draft",
    });
    if (error) {
      toast.error("Erro ao duplicar.");
    } else {
      toast.success("Portal duplicado como rascunho, com link próprio.");
      load();
    }
  }

  async function archive(p: Portal) {
    const { error } = await supabase.from("portals").update({ status: "archived" }).eq("id", p.id);
    if (error) {
      toast.error("Não foi possível arquivar o portal.");
      return;
    }
    toast.success("Portal arquivado.");
    load();
  }

  const inputCls =
    "w-full border border-amber-700/50 bg-slate-950/70 px-3 py-2 text-amber-50 placeholder:text-amber-100/45 focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300/40";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-foreground">Meus Portais NFC</h1>
        <button onClick={startNew} className="btn-gold">+ Novo portal</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="relative mt-6 space-y-5 overflow-hidden rounded-sm border border-amber-500/40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/35 via-slate-950 to-slate-950 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden="true"><div className="absolute -right-8 -top-10 h-48 w-48 rounded-full border border-amber-300/40" /><div className="absolute -right-3 -top-5 h-36 w-36 rounded-full border border-amber-300/30" /><div className="absolute bottom-8 left-8 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_18px_5px_rgba(251,191,36,0.25)]" /></div><div className="relative z-10"><p className="font-display text-2xl tracking-wide text-amber-200">{editing ? `✦ Editar portal: ${editing.name} ✦` : "✦ Abrir novo portal ✦"}</p><p className="mt-2 max-w-2xl text-sm text-amber-100/70">Personalize esta passagem mágica: abertura, vídeo, destino e trilha sonora.</p></div>
          <div className="relative z-10 grid gap-4 md:grid-cols-2">
            <input required placeholder="Nome do portal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Universo (livro, filme, série)" value={form.universe} onChange={(e) => setForm({ ...form, universe: e.target.value })} className={inputCls} />
            <input placeholder="URL da capa" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className={inputCls} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
            <input placeholder="Título da abertura" value={form.intro_title} onChange={(e) => setForm({ ...form, intro_title: e.target.value })} className={inputCls} />
            <input placeholder="Texto complementar da abertura" value={form.intro_subtitle} onChange={(e) => setForm({ ...form, intro_subtitle: e.target.value })} className={inputCls} />
            <input placeholder="URL do vídeo de abertura (MP4)" value={form.intro_video_url} onChange={(e) => setForm({ ...form, intro_video_url: e.target.value })} className={inputCls} />
            <input placeholder="Texto do botão de entrada" value={form.intro_cta_text} onChange={(e) => setForm({ ...form, intro_cta_text: e.target.value })} className={inputCls} />
            <label className="text-sm text-muted-foreground">
              Catálogo de produtos deste tema
              <select
                value={categories.find((category) => form.store_category_url === `/loja?categoria=${category.slug}`)?.slug ?? ""}
                onChange={(e) => {
                  const category = categories.find((item) => item.slug === e.target.value);
                  if (category) setForm({ ...form, store_category_url: `/loja?categoria=${category.slug}` });
                }}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">Escolha uma categoria da loja (opcional)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.parent_id ? "↳ " : ""}{category.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs">Escolha a categoria ou subcategoria que reúne os produtos deste universo. Você também pode colar um link manualmente abaixo.</span>
            </label>
            <input
              placeholder="Link do catálogo/categoria na loja"
              value={form.store_category_url}
              onChange={(e) => setForm({ ...form, store_category_url: e.target.value })}
              className={inputCls}
            />
            <label className="relative z-10 flex items-center gap-2 text-sm text-amber-100/80">
              <input type="checkbox" checked={form.intro_enabled} onChange={(e) => setForm({ ...form, intro_enabled: e.target.checked })} />
              Abertura animada ativa
            </label>
            <label className="text-sm text-muted-foreground">
              Duração da abertura (ms)
              <input type="number" min="500" max="10000" value={form.intro_duration_ms} onChange={(e) => setForm({ ...form, intro_duration_ms: Number(e.target.value) })} className={`mt-1 ${inputCls}`} />
            </label>
            <input placeholder="Link da playlist do Spotify" value={form.spotify_playlist_url} onChange={(e) => setForm({ ...form, spotify_playlist_url: e.target.value })} className={inputCls} />
            <input placeholder="Título da seção de playlist" value={form.spotify_title} onChange={(e) => setForm({ ...form, spotify_title: e.target.value })} className={inputCls} />
          </div>
          <div className="relative z-10"><label className="mb-2 block text-sm text-amber-100/80">Descrição da playlist</label><textarea placeholder="Descrição da playlist" rows={2} value={form.spotify_description} onChange={(e) => setForm({ ...form, spotify_description: e.target.value })} className={inputCls} /></div>
          <div className="relative z-10">
            <label className="mb-2 block text-sm text-amber-100/80">Paleta visual e carrossel temático (JSON)</label>
            <textarea rows={9} spellCheck={false} value={form.theme_json} onChange={(e) => setForm({ ...form, theme_json: e.target.value })} className={inputCls} />
            <p className="mt-2 text-xs text-amber-100/60">Use palette.background, palette.surface, palette.text, palette.accent e palette.buttonText para personalizar as cores. carousel_items aceita objetos com title, description, image_url e url.</p>
            <p className="mt-1 text-xs text-amber-100/60">Exemplo: {"{\"palette\":{\"background\":\"#17251d\",\"surface\":\"#26382d\",\"text\":\"#f5edda\",\"accent\":\"#c6a65b\",\"buttonText\":\"#17251d\"},\"carousel_items\":[{\"title\":\"Item especial\",\"description\":\"Uma peça deste universo\",\"image_url\":\"https://...\",\"url\":\"\"}]}"}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.spotify_visible} onChange={(e) => setForm({ ...form, spotify_visible: e.target.checked })} />
            Mostrar seção de playlist
          </label>
          <div className="relative z-10 flex flex-wrap gap-3">
            <button type="submit" className="btn-gold border border-amber-300/60">Salvar alterações</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-amber-700/60 px-4 py-2 text-sm text-amber-100/75 hover:border-amber-300 hover:text-amber-100">Cancelar</button>
          </div>
        </form>
      )}

      {editing && !showForm && (
        <PortalFragmentsEditor portalId={editing.id} />
      )}

      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : loadError ? (
        <div className="mt-8 border border-destructive/40 p-5 text-muted-foreground">
          <p>Não foi possível carregar os portais. Verifique sua conexão e tente novamente.</p>
          <button onClick={load} className="btn-gold mt-4">Tentar novamente</button>
        </div>
      ) : portals.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nenhum portal criado ainda.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {portals.map((p) => (
            <article key={p.id} className="border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden border bg-muted">
                  {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl text-foreground">{p.name}</h2>
                  {p.universe && <p className="text-sm italic text-muted-foreground">{p.universe}</p>}
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}
                  </p>
                </div>
              </div>
              <p className="mt-3 break-all text-sm text-muted-foreground">/portal/{p.slug}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <button onClick={() => copyLink(p)} className="border border-primary px-3 py-1 text-primary hover:bg-primary hover:text-primary-foreground">
                  {copiedId === p.id ? "✓ Copiado!" : "Copiar link NFC"}
                </button>
                {p.status === "published" && (
                  <Link to="/portal/$slug" params={{ slug: p.slug }} className="px-3 py-1 text-muted-foreground hover:text-primary">
                    Visualizar
                  </Link>
                )}
                <button onClick={() => startEdit(p)} className="px-3 py-1 text-muted-foreground hover:text-primary">Editar</button>
                <button onClick={() => duplicate(p)} className="px-3 py-1 text-muted-foreground hover:text-primary">Duplicar</button>
                {p.status !== "archived" && (
                  <button onClick={() => archive(p)} className="px-3 py-1 text-muted-foreground hover:text-destructive">Arquivar</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
