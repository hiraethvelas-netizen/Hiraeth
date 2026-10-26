
import { createFileRoute } from "@tanstack/react-router";
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

function Aparencia() {
  const [items, setItems] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyShortcut);

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
    setForm({ ...emptyShortcut, position: items.length + 1 });
    setMessage("");
  }

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      href: form.href.trim(),
      image_key: form.image_key,
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
              type="url"
              value={/^https?:\/\//i.test(form.image_key) ? form.image_key : ""}
              onChange={(e) => setForm({ ...form, image_key: e.target.value.trim() })}
              className="border bg-transparent px-3 py-3"
              placeholder="Cole aqui o link direto da imagem (https://...)"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Use um link público direto para a imagem. Para manter uma imagem padrão, escolha uma opção abaixo.
            </span>
            <select
              value={/^https?:\/\//i.test(form.image_key) ? "custom" : form.image_key}
              onChange={(e) => setForm({ ...form, image_key: e.target.value === "custom" ? "" : e.target.value })}
              className="border bg-background px-3 py-3"
            >
              <option value="forest">Floresta (padrão)</option>
              <option value="portal">Portal (padrão)</option>
              <option value="phoenix">Fênix (padrão)</option>
              <option value="banner">Banner do portal (padrão)</option>
              <option value="custom">Usar link de imagem acima</option>
            </select>
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
