
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Shortcut = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  image_key: string;
  position: number;
  active: boolean;
};

const emptyShortcut: Omit<Shortcut, "id"> = {
  title: "",
  description: "",
  href: "/",
  image_key: "portal",
  position: 1,
  active: true,
};

const imageOptions = [
  { value: "forest", label: "Floresta" },
  { value: "portal", label: "Portal" },
  { value: "phoenix", label: "Fênix" },
  { value: "banner", label: "Banner" },
];

export const Route = createFileRoute("/src/routes/admin/aparencia")({
  ssr: false,
  head: () => ({ meta: [{ title: "Aparência — Admin Hiraeth" }] }),
  component: AdminAparencia,
});

function AdminAparencia() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_shortcuts")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      toast.error("Não foi possível carregar os atalhos: " + error.message);
    } else {
      setShortcuts((data ?? []) as Shortcut[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function changeField(
    id: string,
    field: keyof Shortcut,
    value: string | number | boolean,
  ) {
    setShortcuts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function saveAll() {
    setSaving(true);

    for (const item of shortcuts) {
      const { error } = await (supabase as any)
        .from("site_shortcuts")
        .update({
          title: item.title,
          description: item.description,
          href: item.href,
          image_key: item.image_key,
          position: item.position,
          active: item.active,
        })
        .eq("id", item.id);

      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        setSaving(false);
        return;
      }
    }

    toast.success("Aparência salva com sucesso!");
    setSaving(false);
    await load();
  }

  async function addShortcut() {
    const { data, error } = await (supabase as any)
      .from("site_shortcuts")
      .insert({
        ...emptyShortcut,
        title: "Novo atalho",
        position: shortcuts.length + 1,
      })
      .select("*")
      .single();

    if (error) {
      toast.error("Não foi possível criar o atalho: " + error.message);
      return;
    }

    setShortcuts((current) =>
      [...current, data as Shortcut].sort(
        (a, b) => a.position - b.position,
      ),
    );
    toast.success("Novo atalho criado.");
  }

  async function removeShortcut(item: Shortcut) {
    if (!window.confirm(`Deseja excluir o atalho "${item.title}"?`)) return;

    const { error } = await (supabase as any)
      .from("site_shortcuts")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Não foi possível excluir: " + error.message);
      return;
    }

    setShortcuts((current) =>
      current.filter((shortcut) => shortcut.id !== item.id),
    );
    toast.success("Atalho excluído.");
  }

  const inputClass =
    "w-full border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Hiraeth • Personalização
          </p>
          <h1 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
            Aparência do aplicativo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Personalize os atalhos que aparecem na loja.
          </p>
        </div>

        <button
          onClick={saveAll}
          disabled={saving || loading}
          className="btn-gold disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <div className="border border-border bg-card p-4">
        <p className="font-display text-xl text-foreground">
          Atalhos da página inicial
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite os textos, escolha uma imagem, altere os links e organize a
          ordem de exibição. Desative um atalho para ocultá-lo.
        </p>
      </div>

      {loading ? (
        <p className="py-8 text-muted-foreground">Carregando atalhos...</p>
      ) : shortcuts.length === 0 ? (
        <div className="border border-border p-6">
          <p>Nenhum atalho foi encontrado no banco de dados.</p>
          <button onClick={load} className="btn-gold mt-4">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {shortcuts.map((item) => (
            <section
              key={item.id}
              className="space-y-4 border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-primary">
                  {item.title || "Atalho sem título"}
                </h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) =>
                      changeField(item.id, "active", e.target.checked)
                    }
                  />
                  Visível
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Título</span>
                  <input
                    className={inputClass}
                    value={item.title}
                    onChange={(e) =>
                      changeField(item.id, "title", e.target.value)
                    }
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Descrição</span>
                  <input
                    className={inputClass}
                    value={item.description ?? ""}
                    onChange={(e) =>
                      changeField(item.id, "description", e.target.value)
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Link de destino</span>
                  <input
                    className={inputClass}
                    value={item.href}
                    onChange={(e) =>
                      changeField(item.id, "href", e.target.value)
                    }
                    placeholder="/loja"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Imagem</span>
                  <select
                    className={inputClass}
                    value={item.image_key}
                    onChange={(e) =>
                      changeField(item.id, "image_key", e.target.value)
                    }
                  >
                    {imageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Posição na página</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={item.position}
                    onChange={(e) =>
                      changeField(
                        item.id,
                        "position",
                        Number(e.target.value),
                      )
                    }
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => removeShortcut(item)}
                  className="border border-border px-4 py-2 text-sm text-muted-foreground hover:text-destructive"
                >
                  Excluir atalho
                </button>
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-3">
            <button onClick={addShortcut} className="border border-border px-4 py-3">
              + Adicionar atalho
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="btn-gold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Esta tela salva as configurações no banco de dados. A conexão dessas
        configurações com as imagens e os atalhos visíveis na loja será feita
        em uma etapa separada.
      </p>
    </main>
  );
}
