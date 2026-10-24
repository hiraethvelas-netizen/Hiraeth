import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export const Route = createFileRoute("/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Admin Hiraeth" }] }),
  component: AdminCategorias,
});

function AdminCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("position");
    setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({
      name,
      slug: slugify(name),
      position: categories.length + 1,
    });
    if (error) {
      toast.error("Erro ao criar categoria (nome já existe?).");
    } else {
      setName("");
      toast.success("Categoria criada.");
      load();
    }
  }

  async function toggleVisible(c: Category) {
    await supabase.from("categories").update({ visible: !c.visible }).eq("id", c.id);
    load();
  }

  async function move(c: Category, dir: -1 | 1) {
    const idx = categories.findIndex((x) => x.id === c.id);
    const other = categories[idx + dir];
    if (!other) return;
    await supabase.from("categories").update({ position: other.position }).eq("id", c.id);
    await supabase.from("categories").update({ position: c.position }).eq("id", other.id);
    load();
  }

  async function remove(c: Category) {
    if (!confirm(`Remover a categoria "${c.name}"?`)) return;
    await supabase.from("categories").delete().eq("id", c.id);
    load();
  }

  const inputCls =
    "border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <h1 className="text-4xl text-foreground">Categorias</h1>

      <form onSubmit={add} className="mt-6 flex gap-3">
        <input required placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} className={`flex-1 ${inputCls}`} />
        <button type="submit" className="btn-gold">Adicionar</button>
      </form>

      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : (
        <ul className="mt-8 divide-y">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="flex-1 text-lg text-foreground">{c.name}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{c.visible ? "Visível" : "Oculta"}</span>
              <button onClick={() => move(c, -1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">↑</button>
              <button onClick={() => move(c, 1)} disabled={i === categories.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">↓</button>
              <button onClick={() => toggleVisible(c)} className="text-sm text-muted-foreground hover:text-primary">
                {c.visible ? "Ocultar" : "Exibir"}
              </button>
              <button onClick={() => remove(c)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
