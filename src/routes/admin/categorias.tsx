import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories"> & { parent_id?: string | null };

export const Route = createFileRoute("/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Admin Hiraeth" }] }),
  component: AdminCategorias,
});

function AdminCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("*").order("position");
    if (error) toast.error("Não foi possível carregar categorias.");
    setCategories((data ?? []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    const siblings = categories.filter((c) => (c.parent_id ?? "") === parentId);
    const { error } = await supabase.from("categories").insert({
      name: cleanName, slug: slugify(cleanName), parent_id: parentId || null,
      position: siblings.length + 1,
    } as never);
    if (error) toast.error("Erro ao criar categoria ou subcategoria (nome/link pode já existir).");
    else { setName(""); toast.success(parentId ? "Subcategoria criada." : "Categoria criada."); load(); }
  }

  async function toggleVisible(c: Category) {
    const { error } = await supabase.from("categories").update({ visible: !c.visible }).eq("id", c.id);
    if (error) toast.error("Não foi possível alterar a visibilidade."); else load();
  }

  async function move(c: Category, dir: -1 | 1) {
    const siblings = categories.filter((x) => (x.parent_id ?? "") === (c.parent_id ?? ""));
    const idx = siblings.findIndex((x) => x.id === c.id);
    const other = siblings[idx + dir];
    if (!other) return;
    const a = await supabase.from("categories").update({ position: other.position }).eq("id", c.id);
    const b = await supabase.from("categories").update({ position: c.position }).eq("id", other.id);
    if (a.error || b.error) toast.error("Não foi possível reordenar."); else load();
  }

  async function remove(c: Category) {
    const children = categories.filter((x) => x.parent_id === c.id);
    const message = children.length ? `Remover "${c.name}" e suas ${children.length} subcategoria(s)?` : `Remover "${c.name}"?`;
    if (!confirm(message)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error("Não foi possível remover. Verifique se há produtos associados."); else { toast.success("Item removido."); load(); }
  }

  const inputCls = "border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
  const parents = categories.filter((c) => !c.parent_id);
  const renderRow = (c: Category, index: number, siblings: Category[]) => <li key={c.id} className={`flex flex-wrap items-center gap-3 border-b py-3 ${c.parent_id ? "pl-7" : ""}`}>
    <span className="text-primary">{c.parent_id ? "↳" : "◈"}</span><span className="min-w-28 flex-1 text-foreground">{c.name}<span className="ml-2 text-xs text-muted-foreground">{c.parent_id ? "Subcategoria" : "Categoria principal"}</span></span>
    <span className="text-xs uppercase tracking-widest text-muted-foreground">{c.visible ? "Visível" : "Oculta"}</span>
    <button onClick={() => move(c, -1)} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">↑</button>
    <button onClick={() => move(c, 1)} disabled={index === siblings.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">↓</button>
    <button onClick={() => toggleVisible(c)} className="text-sm text-muted-foreground hover:text-primary">{c.visible ? "Ocultar" : "Exibir"}</button>
    <button onClick={() => remove(c)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
  </li>;

  return <div>
    <h1 className="text-4xl text-foreground">Categorias</h1>
    <p className="mt-2 text-sm text-muted-foreground">Organize o catálogo em categorias principais e subcategorias, como Filmes → Variety.</p>
    <form onSubmit={add} className="mt-6 grid gap-3 border bg-card p-5 md:grid-cols-[1fr_1fr_auto]">
      <input required placeholder="Nome da categoria ou subcategoria" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}><option value="">Categoria principal (sem categoria pai)</option>{parents.map((c) => <option key={c.id} value={c.id}>Subcategoria de: {c.name}</option>)}</select>
      <button type="submit" className="btn-gold">Adicionar</button>
    </form>
    {loading ? <p className="mt-8 text-muted-foreground">Carregando...</p> : <ul className="mt-8">{parents.map((c, i) => <div key={c.id}>{renderRow(c, i, parents)}<ul>{categories.filter((sub) => sub.parent_id === c.id).map((sub, j, arr) => renderRow(sub, j, arr))}</ul></div>)}{categories.filter((c) => c.parent_id && !parents.some((p) => p.id === c.parent_id)).map((c, i, arr) => renderRow(c, i, arr))}</ul>}
  </div>;
}
