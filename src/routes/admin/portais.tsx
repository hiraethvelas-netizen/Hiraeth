import { MagicPollAdmin } from "@/components/admin/MagicPollAdmin";
import { MagicPollResults } from "@/components/admin/MagicPollResults";
import { NfcCodeIssuer } from "@/components/admin/NfcCodeIssuer";
import type { Json } from "@/integrations/supabase/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { permanentPortalUrl } from "@/lib/portal-public-url";
import { toast } from "sonner";
import { PortalFragmentsEditor } from "@/components/admin/PortalFragmentsEditor";
import { PortalInspiracoesAdmin } from "@/routes/admin/portal-inspiracoes";
import { PortalGalleryEditor } from "@/components/admin/PortalGalleryEditor";
import { PortalFeaturedProductsEditor } from "@/components/admin/PortalFeaturedProductsEditor";
import { PortalShortcutImagesEditor } from "@/components/admin/PortalShortcutImagesEditor";
import { galleryDraftFromTheme, isMagicWorld, isSafePortalUrl, spotifyPlaylistUrl } from "@/lib/portal-experience";
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
  intro_title: "O Mundo da Magia",
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
  const [editorTab, setEditorTab] = useState<"config" | "inspirations">("config");
  const [pollEditorOpen, setPollEditorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const advancedSettingsRef = useRef<HTMLDetailsElement>(null);
  const themeJsonRef = useRef<HTMLTextAreaElement>(null);

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


  async function copyLink(p: Portal) {
    try {
      await navigator.clipboard.writeText(permanentPortalUrl(p.slug));
      setCopiedId(p.id);
      toast.success("Link NFC copiado! Cole no aplicativo de gravação da tag.");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o endereço permanente exibido no painel.");
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
    setEditorTab("config");
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setForm(emptyForm);
    setEditorTab("config");
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const newSlug = editing?.slug ?? slugify(form.name);
    if (!newSlug) {
      toast.error("Informe um nome válido, com letras ou números, para gerar o link NFC permanente.");
      return;
    }
    const payload = {
      name: form.name,
      universe: form.universe || null,
      cover_url: form.cover_url || null,
      intro_title: form.intro_title || null,
      intro_subtitle: form.intro_subtitle || null,
      intro_video_url: form.intro_video_url || null,
      intro_cta_text: form.intro_cta_text.trim() || "Atravesse o Portal",
      store_category_url: form.store_category_url.trim() || "/loja",
      intro_enabled: editing && isMagicWorld(editing.slug) ? true : form.intro_enabled,
      intro_duration_ms: Number(form.intro_duration_ms) || 3000,
      spotify_playlist_url: form.spotify_playlist_url || null,
      spotify_title: form.spotify_title || null,
      spotify_description: form.spotify_description || null,
      spotify_visible: form.spotify_visible,
      // Um portal publicado pode estar gravado em velas já vendidas.
      // Edições de conteúdo jamais despublicam o destino NFC existente.
      status: editing?.status === "published" ? "published" : form.status,
      updated_at: new Date().toISOString(),
    };
    let parsedTheme: Json;
    try { parsedTheme = JSON.parse(form.theme_json || "{}"); }
    catch {
      if (advancedSettingsRef.current) advancedSettingsRef.current.open = true;
      themeJsonRef.current?.focus();
      toast.error("O JSON do tema está inválido. Revise a paleta e os itens do carrossel.");
      return;
    }
    if (form.spotify_playlist_url.trim() && !spotifyPlaylistUrl(form.spotify_playlist_url)) {
      toast.error("Cole um link válido de playlist do Spotify, como https://open.spotify.com/playlist/...");
      return;
    }
    if (form.intro_video_url.trim() && !isSafePortalUrl(form.intro_video_url)) {
      toast.error("Informe um link HTTPS ou um caminho válido para o vídeo de abertura.");
      return;
    }
    const photos=galleryDraftFromTheme(parsedTheme);
    if (photos.some(photo=>photo.image_url && !isSafePortalUrl(photo.image_url)) ||
        photos.some(photo=>photo.url && !isSafePortalUrl(photo.url))) {
      toast.error("Revise as URLs das fotos do Natal. Use links HTTPS ou caminhos internos válidos.");
      return;
    }
    const safePayload = { ...payload, theme: parsedTheme };
    const { error } = editing
      ? await supabase.from("portals").update(safePayload).eq("id", editing.id)
      : await supabase.from("portals").insert({ ...safePayload, slug: newSlug });
    if (error) {
      toast.error(error.message.includes("unique") ? "Já existe um portal com esse nome." : "Erro ao salvar.");
    } else {
      toast.success(editing ? "Portal atualizado." : "Portal criado.");
      setShowForm(false);
      if (editing) setEditorTab("inspirations");
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
    if (p.status === "published") {
      toast.error("Este portal já está publicado e pode estar gravado em velas vendidas. Para preservar o NFC, ele deve continuar acessível.");
      return;
    }
    const { error } = await supabase.from("portals").update({ status: "archived" }).eq("id", p.id);
    if (error) {
      toast.error("Não foi possível arquivar o portal.");
      return;
    }
    toast.success("Portal arquivado.");
    load();
  }

  const inputCls =
    "w-full min-w-0 rounded-sm border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35 disabled:cursor-not-allowed disabled:bg-[#eee8d7] disabled:opacity-100";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">{editing ? `Editar: ${editing.name}` : "Meus Portais NFC"}</h1>
        {editing || showForm
          ? <button type="button" onClick={() => { setEditing(null); setShowForm(false); setEditorTab("config"); }}
              className="rounded-full border border-primary/35 px-4 py-2 text-sm text-foreground hover:bg-primary/10">
              Voltar aos portais
            </button>
          : <button onClick={startNew} className="btn-gold">+ Novo portal</button>}
      </div>

      {editing && <nav className="mt-5 flex flex-wrap gap-2" aria-label="Editar seções do portal">
        <button type="button" aria-pressed={editorTab === "config"}
          onClick={() => { setEditorTab("config"); setShowForm(true); }}
          className={`rounded-full border px-4 py-2.5 text-sm font-medium ${editorTab === "config" ? "border-primary bg-primary/15 text-foreground" : "border-primary/30 text-muted-foreground"}`}>
          Configurações do portal
        </button>
        <button type="button" aria-pressed={editorTab === "inspirations"}
          onClick={() => { setEditorTab("inspirations"); setShowForm(false); }}
          className={`rounded-full border px-4 py-2.5 text-sm font-medium ${editorTab === "inspirations" ? "border-primary bg-primary/15 text-foreground" : "border-primary/30 text-muted-foreground"}`}>
          <Pencil size={15} className="mr-2 inline" aria-hidden="true" />
          {isMagicWorld(editing.slug) ? "Fotos e inspirações" : "Conteúdos do portal"}
        </button>
      </nav>}

      {showForm && editorTab === "config" && (
        <form onSubmit={save}
          aria-label="Configurações do portal"
          style={{ "--primary": "#59612f", "--color-primary": "#59612f" } as CSSProperties}
          className="relative mt-6 space-y-5 overflow-hidden rounded-sm border border-primary/40 bg-card p-5 text-card-foreground shadow-[0_12px_35px_rgba(38,48,29,0.12)] md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden="true"><div className="absolute -right-8 -top-10 h-48 w-48 rounded-full border border-primary/40" /><div className="absolute -right-3 -top-5 h-36 w-36 rounded-full border border-primary/30" /><div className="absolute bottom-8 left-8 h-1 w-1 rounded-full bg-primary" /></div>
          <div role="note" className="relative z-10 rounded-lg border border-primary/35 bg-[#e9e7d2] p-4 text-sm leading-relaxed text-[#34402b]">
            <strong className="block">Endereço NFC permanente</strong>
            {editing ? <>
              <p className="mt-1">O link <span className="break-all font-semibold">/portal/{editing.slug}</span> não muda ao editar este portal.</p>
              <label htmlFor="portal-permanent-url" className="mt-3 block font-medium">URL pública permanente para a etiqueta NFC</label>
              <input id="portal-permanent-url" readOnly value={permanentPortalUrl(editing.slug)}
                onFocus={event => event.currentTarget.select()}
                className="mt-1 w-full rounded border border-[#878e47]/45 bg-white px-3 py-2 text-xs text-[#34402b]" />
              <button type="button" onClick={() => void copyLink(editing)}
                className="mt-2 rounded-full border border-[#59612f] px-4 py-2 font-medium text-[#34402b] hover:bg-[#d9dfbf]">
                {copiedId === editing.id ? "✓ Link copiado" : "Copiar link NFC permanente"}
              </button>
              {editing.status !== "published" && <p className="mt-2 text-xs">Este endereço só estará acessível às clientes depois que o portal for publicado. Ele já está reservado para este portal.</p>}
            </> : <p className="mt-1">
              Ao criar o portal, o endereço será gerado automaticamente com o domínio público
              <strong> hiraeth-oficial.lovable.app</strong>. O link ficará disponível para copiar
              na lista e na área de edição, e não mudará ao editar nome, fotos, vídeo ou textos.
              {form.name.trim() && <span className="mt-2 block break-all font-mono text-xs">
                {slugify(form.name) ? <>Previsão: {permanentPortalUrl(slugify(form.name))}</> : "Digite letras ou números para gerar o endereço."}
              </span>}
            </p>}
            <details className="mt-2">
              <summary className="cursor-pointer font-medium underline underline-offset-4">Sobre o endereço permanente</summary>
              <p className="mt-2">Você pode mudar nome, vídeo, fotos, textos e playlist sem alterar o endereço gravado nas tags NFC. Portais publicados continuam protegidos contra despublicação e arquivamento. Preserve o domínio da loja e o portal original.</p>
            </details>
          </div>

          <fieldset className="relative z-10 min-w-0 space-y-4">
            <legend className="mb-3 font-display text-xl text-foreground">Dados do portal</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-foreground">Nome do portal
                <input required placeholder="Nome do portal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Universo
                <input placeholder="Universo (livro, filme, série)" value={form.universe} onChange={(e) => setForm({ ...form, universe: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Imagem de capa (URL)
                <input placeholder="URL da capa" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Status
                <select value={form.status} disabled={editing?.status === "published"} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </label>
              <label className="text-sm text-foreground">Catálogo de produtos deste tema
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
              </label>
              <label className="text-sm text-foreground">Link do catálogo (opcional)
                <input placeholder="Link do catálogo/categoria na loja" value={form.store_category_url}
                  onChange={(e) => setForm({ ...form, store_category_url: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Escolha uma categoria ou informe o link do catálogo.</p>
          </fieldset>

          <fieldset className="relative z-10 min-w-0 space-y-4 border-t border-primary/20 pt-4">
            <legend className="font-display text-xl text-foreground">Abertura em vídeo</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-foreground">Título da abertura
                <input placeholder="Título da abertura" value={form.intro_title} onChange={(e) => setForm({ ...form, intro_title: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Texto de apoio (opcional)
                <input placeholder="Texto complementar da abertura" value={form.intro_subtitle} onChange={(e) => setForm({ ...form, intro_subtitle: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Vídeo de abertura (MP4)
                <input placeholder="URL do vídeo de abertura (MP4)" value={form.intro_video_url} onChange={(e) => setForm({ ...form, intro_video_url: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Botão de entrada
                <input placeholder="Texto do botão de entrada" value={form.intro_cta_text} onChange={(e) => setForm({ ...form, intro_cta_text: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox"
                checked={editing && isMagicWorld(editing.slug) ? true : form.intro_enabled}
                disabled={Boolean(editing && isMagicWorld(editing.slug))}
                onChange={(e) => setForm({ ...form, intro_enabled: e.target.checked })} />
              {editing && isMagicWorld(editing.slug) ? "Vídeo de abertura obrigatório para o mundo da magia" : "Exibir vídeo de abertura"}
            </label>
            <p className="text-xs text-muted-foreground">“Atravesse o Portal” aparece quando o vídeo termina. Trocar o MP4 não muda o link NFC.</p>
          </fieldset>

          <fieldset className="relative z-10 min-w-0 space-y-4 border-t border-primary/20 pt-4">
            <legend className="font-display text-xl text-foreground">Playlist</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-foreground">Link da playlist no Spotify
                <input type="url" placeholder="Playlist: https://open.spotify.com/playlist/..."
                  value={form.spotify_playlist_url} onChange={(e) => setForm({ ...form, spotify_playlist_url: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground">Título da seção de playlist
                <input placeholder="Título da seção de playlist" value={form.spotify_title} onChange={(e) => setForm({ ...form, spotify_title: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm text-foreground md:col-span-2">Descrição da playlist
                <textarea placeholder="Descrição da playlist" rows={2} value={form.spotify_description} onChange={(e) => setForm({ ...form, spotify_description: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.spotify_visible} onChange={(e) => setForm({ ...form, spotify_visible: e.target.checked })} />
              Mostrar seção de playlist
            </label>
          </fieldset>

          {editing && isMagicWorld(editing.slug) && <PortalShortcutImagesEditor themeJson={form.theme_json}
            onChange={theme_json => setForm(previous => ({ ...previous, theme_json }))} />}
          {editing && isMagicWorld(editing.slug) && <PortalFeaturedProductsEditor themeJson={form.theme_json}
            onChange={theme_json => setForm(previous => ({ ...previous, theme_json }))} />}
          <PortalGalleryEditor themeJson={form.theme_json}
            onChange={theme_json=>setForm(previous=>({...previous,theme_json}))}/>
          <details ref={advancedSettingsRef} className="relative z-10 rounded-lg border border-primary/30 p-4">
            <summary className="cursor-pointer font-medium text-foreground">Configurações avançadas</summary>
            <label className="mt-4 block text-sm text-foreground">Paleta e opções do portal (JSON)
              <textarea ref={themeJsonRef} rows={6} spellCheck={false} value={form.theme_json} onChange={(e) => setForm({ ...form, theme_json: e.target.value })} className={`mt-1 font-mono text-sm ${inputCls}`} />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Para adicionar fotos, use o editor visual acima.</p>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer underline underline-offset-4">Ver exemplo de configuração</summary>
              <pre className="mt-2 max-w-full whitespace-pre-wrap break-all font-mono">{"{\"palette\":{\"background\":\"#17251d\",\"surface\":\"#26382d\",\"text\":\"#f5edda\",\"accent\":\"#c6a65b\",\"buttonText\":\"#17251d\"},\"carousel_items\":[{\"title\":\"Item especial\",\"description\":\"Uma peça deste universo\",\"image_url\":\"https://...\",\"url\":\"\"}]}"}</pre>
            </details>
          </details>
          <details className="relative z-10 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Ajuda do portal</summary>
            <p className="mt-2">O portal já inclui acesso à playlist, ao acervo, às inspirações e ao aplicativo. A playlist fica “em preparação” até receber um link. Salve o portal para editar fotos e referências na aba de conteúdos.</p>
          </details>
          <div className="relative z-10 flex flex-wrap gap-3 border-t border-primary/20 pt-4">
            <button type="submit" className="inline-flex items-center border border-[#525c2a] bg-[#525c2a] px-7 py-3 text-[0.8rem] font-medium uppercase tracking-[0.2em] text-[#fff9eb] transition-colors hover:bg-[#34402b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59612f]">Salvar alterações</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setEditorTab("config"); }} className="border border-primary/50 px-4 py-2 text-sm text-foreground hover:bg-primary/10">Cancelar</button>
          </div>
        </form>
      )}

      {editing && editorTab === "inspirations" && <section className="mt-6 space-y-5">
        {isMagicWorld(editing.slug)
          ? <>
              <PortalInspiracoesAdmin portalId={editing.id} />
              <MagicPollResults />
              <NfcCodeIssuer portalSlug={editing.slug} />
              <section className="rounded-xl border border-primary/25 p-4">
                <button type="button" onClick={() => setPollEditorOpen(value => !value)}
                  className="text-sm font-semibold text-primary underline underline-offset-4">
                  {pollEditorOpen ? "Fechar edição das enquetes" : "Editar enquetes do Mundo da Magia"}
                </button>
                {pollEditorOpen && <div className="mt-4"><MagicPollAdmin /></div>}
              </section>
              <details className="rounded-xl border border-primary/25 bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">Mais textos e fragmentos do portal</summary>
                <PortalFragmentsEditor portalId={editing.id} />
              </details>
            </>
          : <PortalFragmentsEditor portalId={editing.id} />}
      </section>}

      {!editing && !showForm && (loading ? (
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
              <p className="mt-3 break-all text-sm font-medium text-foreground">{permanentPortalUrl(p.slug)}</p>
              {p.status !== "published" && <p className="mt-1 text-xs text-muted-foreground">O link é permanente, mas só funcionará após a publicação do portal.</p>}
              {p.status === "published" && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Link NFC protegido: edições da página não mudam este endereço.</p>}
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
                {p.status === "draft" && (
                  <button onClick={() => archive(p)} className="px-3 py-1 text-muted-foreground hover:text-destructive">Arquivar</button>
                )}
              </div>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
