
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Image, LayoutDashboard, Palette, PanelsTopLeft, ScrollText } from "lucide-react";
import { BannersAdmin } from "@/routes/admin/banners";
import { AdminSobre } from "@/routes/admin/sobre";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Shortcut = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  image_key: string;
  position: number;
  active: boolean;
};

const emptyShortcut = {
  title: "",
  description: "",
  href: "/loja",
  image_key: "portal",
  position: 1,
  active: true,
};

export const Route = createFileRoute("/admin/aparencia")({
  component: Aparencia,
});

type AppearanceSection = "inicio" | "banners" | "historia" | "atalhos" | "paginas";

const SECTIONS = [
  { id: "banners", label: "Banners da inicial", description: "Fotos e destaques que aparecem na página inicial", icon: Image },
  { id: "historia", label: "Conheça a Hiraeth", description: "História da marca, fotos, textos e contatos do rodapé", icon: ScrollText },
  { id: "atalhos", label: "Atalhos da inicial", description: "Botões e acessos rápidos da página inicial", icon: PanelsTopLeft },
  { id: "paginas", label: "Outras páginas", description: "Editar visualmente a loja, biblioteca e cuidados", icon: Palette },
] as const;

function Aparencia() {
  const [section, setSection] = useState<AppearanceSection>("inicio");
  return <div className="space-y-6">
    <div>
      <p className="text-xs uppercase tracking-[.19em] text-primary">Personalização do aplicativo</p>
      <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">Aparência e conteúdo</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Tudo o que você precisa para personalizar o visual e os textos do site, reunido em um só lugar.
      </p>
    </div>
    <nav aria-label="Áreas de aparência" className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setSection("inicio")}
        aria-current={section === "inicio" ? "page" : undefined}
        className={`rounded-full border px-3 py-2 text-sm ${section === "inicio" ? "border-primary bg-primary/15 text-primary" : "border-primary/25 text-muted-foreground"}`}>
        <LayoutDashboard size={15} className="mr-1 inline" aria-hidden="true" /> Visão geral
      </button>
      {SECTIONS.map(item => <button type="button" key={item.id} onClick={() => setSection(item.id)}
        aria-current={section === item.id ? "page" : undefined}
        className={`rounded-full border px-3 py-2 text-sm ${section === item.id ? "border-primary bg-primary/15 text-primary" : "border-primary/25 text-muted-foreground"}`}>
        {item.label}
      </button>)}
    </nav>
    {section === "inicio" && <div className="grid gap-3 sm:grid-cols-2">
      {SECTIONS.map(item => <button type="button" key={item.id} onClick={() => setSection(item.id)}
        className="group flex items-center gap-4 rounded-xl border border-primary/20 bg-card p-5 text-left transition-colors hover:border-primary/55 hover:bg-primary/5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <item.icon size={21} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block font-display text-xl text-foreground">{item.label}</strong>
          <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-primary" aria-hidden="true" />
      </button>)}
    </div>}
    {section === "banners" && <BannersAdmin />}
    {section === "historia" && <AdminSobre />}
    {section === "atalhos" && <SiteShortcutsEditor />}
    {section === "paginas" && <section aria-labelledby="appearance-other-pages" className="space-y-4 rounded-xl border border-primary/20 bg-card p-5">
      <h2 id="appearance-other-pages" className="font-display text-2xl">Editar outras páginas</h2>
      <p className="text-sm text-muted-foreground">Abra a página desejada e use o modo Editar site para alterar os elementos disponíveis. Todas continuam no mesmo endereço.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { to: "/sobre", label: "Conheça a Hiraeth — página pública", detail: "Ver a página e os blocos editáveis" },
          { to: "/loja", label: "Acervo e coleções", detail: "Bolinhas, banners e destaques da loja" },
          { to: "/biblioteca", label: "Biblioteca e favoritos", detail: "Organização da estante e experiências" },
          { to: "/cuidados", label: "Cuidados com a vela", detail: "Informações e orientações de uso" },
        ] as const).map(item => <Link key={item.to} to={item.to}
          className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 p-4 text-sm text-foreground hover:border-primary hover:text-primary">
          <span><strong className="block">{item.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </Link>)}
      </div>
    </section>}
  </div>;
}

function SiteShortcutsEditor() {
  const [items, setItems] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyShortcut);
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function loadItems() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_shortcuts")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      setMessage("Não foi possível carregar os atalhos: " + error.message);
    } else {
      setItems((data ?? []) as Shortcut[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  function startEdit(item: Shortcut) {
    setEditingId(item.id);
    setImageFile(null);
    setForm({
      title: item.title,
      description: item.description ?? "",
      href: item.href,
      image_key: item.image_key,
      position: item.position,
      active: item.active,
    });
    setMessage("");
  }

  function startNew() {
    setEditingId(null);
    setImageFile(null);
    setForm({ ...emptyShortcut, position: items.length + 1 });
    setMessage("");
  }

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    let imageKey = form.image_key;
    try {
      if (imageFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
          throw new Error("O armazenamento aceita imagens JPG, PNG ou WebP.");
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error("A imagem precisa ter no máximo 5 MB. Reduza o tamanho e tente novamente.");
        }
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `shortcuts/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("site-banners").upload(path, imageFile, { upsert: false, contentType: imageFile.type });
        if (uploadError) throw uploadError;
        imageKey = supabase.storage.from("site-banners").getPublicUrl(path).data.publicUrl;
      }
    } catch (err) {
      setMessage("Não foi possível enviar a imagem: " + (err instanceof Error ? err.message : "erro desconhecido"));
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      href: form.href.trim(),
      image_key: imageKey,
      position: Number(form.position),
      active: form.active,
    };

    const result = editingId
      ? await (supabase as any)
          .from("site_shortcuts")
          .update(payload)
          .eq("id", editingId)
      : await (supabase as any)
          .from("site_shortcuts")
          .insert(payload);

    if (result.error) {
      setMessage("Erro ao salvar: " + result.error.message);
    } else {
      setMessage("Atalho salvo com sucesso!");
      setEditingId(null);
      setImageFile(null);
      setForm({ ...emptyShortcut, position: items.length + 2 });
      await loadItems();
    }

    setSaving(false);
  }

  async function toggleActive(item: Shortcut) {
    const { error } = await (supabase as any)
      .from("site_shortcuts")
      .update({ active: !item.active })
      .eq("id", item.id);

    setMessage(
      error
        ? "Erro ao alterar visibilidade: " + error.message
        : "Visibilidade atualizada."
    );

    if (!error) await loadItems();
  }

  async function deleteItem(item: Shortcut) {
    const confirmed = window.confirm(
      `Excluir o atalho "${item.title}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    const { error } = await (supabase as any)
      .from("site_shortcuts")
      .delete()
      .eq("id", item.id);

    setMessage(
      error
        ? "Erro ao excluir: " + error.message
        : "Atalho excluído."
    );

    if (!error) await loadItems();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-primary">
          Personalização
        </p>
        <h1 className="mt-2 font-display text-4xl text-foreground">
          Aparência do aplicativo
        </h1>
        <p className="mt-3 text-muted-foreground">
          Gerencie os atalhos exibidos na navegação da loja Hiraeth.
        </p>
      </div>

      {message && (
        <p role="status" className="border border-primary/30 p-4 text-sm">
          {message}
        </p>
      )}

      <section className="border p-5 md:p-7">
        <h2 className="font-display text-2xl">
          {editingId ? "Editar atalho" : "Novo atalho"}
        </h2>

        <form onSubmit={saveItem} className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Título
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="border bg-transparent px-3 py-3"
              placeholder="Ex.: Conheça a Hiraeth"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Descrição
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border bg-transparent px-3 py-3"
              placeholder="Uma frase curta"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Link de destino
            <input
              required
              value={form.href}
              onChange={(e) =>
                setForm({ ...form, href: e.target.value })
              }
              className="border bg-transparent px-3 py-3"
              placeholder="/loja"
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            Imagem do atalho
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full border bg-transparent px-3 py-3 file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Escolha uma imagem do celular ou computador (JPG, PNG ou WebP, até 5 MB). Ao salvar, ela será enviada automaticamente. Se não escolher outra, a imagem atual será mantida.
            </span>
            <select
              value={/^https?:\/\//i.test(form.image_key) ? "uploaded" : form.image_key}
              onChange={(e) => setForm({ ...form, image_key: e.target.value })}
              className="border bg-background px-3 py-3"
            >
              <option value="forest">Floresta (padrão)</option>
              <option value="portal">Portal (padrão)</option>
              <option value="phoenix">Fênix (padrão)</option>
              <option value="banner">Banner do portal (padrão)</option>
              {/^https?:\/\//i.test(form.image_key) && <option value="uploaded">Imagem personalizada atual</option>}
            </select>
            {(imageFile || /^https?:\/\//i.test(form.image_key)) && (
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : form.image_key}
                alt="Prévia da imagem do atalho"
                className="mt-2 h-32 w-32 rounded-full border object-cover"
              />
            )}
          </label>

          <label className="grid gap-2 text-sm">
            Posição na página
            <input
              required
              type="number"
              min="1"
              value={form.position}
              onChange={(e) =>
                setForm({ ...form, position: Number(e.target.value) })
              }
              className="border bg-transparent px-3 py-3"
            />
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            Exibir este atalho na loja
          </label>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar atalho"}
            </button>
            <button
              type="button"
              onClick={startNew}
              className="border px-5 py-3"
            >
              Limpar formulário
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Atalhos cadastrados</h2>

        {loading ? (
          <p className="text-muted-foreground">Carregando atalhos...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum atalho cadastrado.
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-4 border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="font-display text-xl">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description || "Sem descrição"} · {item.href}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Imagem: {item.image_key} · Posição: {item.position} ·{" "}
                  {item.active ? "Visível" : "Oculto"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="border px-3 py-2 text-sm"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  className="border px-3 py-2 text-sm"
                >
                  {item.active ? "Ocultar" : "Exibir"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item)}
                  className="border border-destructive px-3 py-2 text-sm text-destructive"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
