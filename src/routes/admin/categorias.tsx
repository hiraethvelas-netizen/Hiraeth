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

const emptySchedule = { is_temporary: false, starts_at: "", ends_at: "" };

function AdminCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [schedule, setSchedule] = useState(emptySchedule);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("*").order("position");
    if (error) toast.error("Não foi possível carregar categorias.");
    setCategories((data ?? []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setName("");
    setParentId("");
    setSchedule(emptySchedule);
    setEditing(null);
  }

  function startEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setParentId(c.parent_id ?? "");
    setSchedule({
      is_temporary: Boolean(c.is_temporary),
      starts_at: c.starts_at ?? "",
      ends_at: c.ends_at ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    if (schedule.is_temporary && (!schedule.starts_at || !schedule.ends_at || schedule.ends_at < schedule.starts_at)) {
      toast.error("Para uma categoria temporária, informe datas válidas de início e encerramento.");
      return;
    }
    if (editing && parentId === editing.id) {
      toast.error("Uma categoria não pode ser subcategoria dela mesma.");
      return;
    }
    const siblings = categories.filter((c) => (c.parent_id ?? "") === parentId && c.id !== editing?.id);
    const payload = {
      name: cleanName,
      slug: editing ? (editing.name === cleanName ? editing.slug : slugify(cleanName)) : slugify(cleanName),
      parent_id: parentId || null,
      position: editing?.position ?? siblings.length + 1,
      is_temporary: schedule.is_temporary,
      starts_at: schedule.is_temporary ? schedule.starts_at : null,
      ends_at: schedule.is_temporary ? schedule.ends_at : null,
    };
    const result = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload as never);
    if (result.error) {
      toast.error("Erro ao salvar categoria. Verifique se o nome/link já existe e se as datas estão corretas.");
    } else {
      toast.success(editing ? "Categoria atualizada." : parentId ? "Subcategoria criada." : "Categoria criada.");
      resetForm();
      await load();
    }
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

  async function copyCategoryLink(c: Category) {
    const url = `${window.location.origin}/loja?categoria=${encodeURIComponent(c.slug)}`;
    try { await navigator.clipboard.writeText(url); toast.success(`Link da categoria "${c.name}" copiado!`); }
    catch { window.prompt("Copie o link da categoria:", url); }
  }

  const inputCls = "w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
  const parents = categories.filter((c) => !c.parent_id);
  const renderRow = (c: Category, index: number, siblings: Category[]) => <li key={c.id} className={`flex flex-wrap items-center gap-3 border-b py-3 ${c.parent_id ? "pl-7" : ""}`}>
    <span className="text-primary">{c.parent_id ? "↳" : "◈"}</span>
    <span className="min-w-28 flex-1 text-foreground">{c.name}<span className="ml-2 text-xs text-muted-foreground">{c.parent_id ? "Subcategoria" : "Categoria principal"}</span>
      {c.is_temporary && <span className="ml-2 inline-flex border border-amber-500/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-600">Temporária · até {c.ends_at ? new Date(c.ends_at + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span>}
    </span>
    <span className="text-xs uppercase tracking-widest text-muted-foreground">{c.visible ? "Visível" : "Oculta"}</span>
    <button onClick={() => startEdit(c)} className="text-sm text-primary">Editar</button>
    <button onClick={() => move(c, -1)} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">↑</button>
    <button onClick={() => move(c, 1)} disabled={index === siblings.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">↓</button>
    <button onClick={() => copyCategoryLink(c)} className="border border-primary px-3 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground">Copiar link</button>
    <button onClick={() => toggleVisible(c)} className="text-sm text-muted-foreground hover:text-primary">{c.visible ? "Ocultar" : "Exibir"}</button>
    <button onClick={() => remove(c)} className="text-sm text-muted-foreground hover:text-destructive">Remover</button>
  </li>;

  return <div>
    <h1 className="text-4xl text-foreground">Categorias</h1>
    <p className="mt-2 text-sm text-muted-foreground">Organize categorias e subcategorias e programe coleções temporárias.</p>
    <form onSubmit={save} className="mt-6 space-y-4 border bg-card p-5">
      <h2 className="font-display text-xl text-primary">{editing ? `Editar: ${editing.name}` : "Adicionar categoria ou subcategoria"}</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <input required placeholder="Nome da categoria ou subcategoria" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}><option value="">Categoria principal (sem categoria pai)</option>{parents.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>Subcategoria de: {c.name}</option>)}</select>
      </div>
      <div className="border border-primary/20 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
          <input type="checkbox" checked={schedule.is_temporary} onChange={(e) => setSchedule((s) => ({ ...s, is_temporary: e.target.checked }))} />
          Esta categoria/subcategoria é temporária
        </label>
        {schedule.is_temporary ? <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-muted-foreground">Data de início<input required type="date" value={schedule.starts_at} onChange={(e) => setSchedule((s) => ({ ...s, starts_at: e.target.value }))} className={inputCls} /></label>
          <label className="text-sm text-muted-foreground">Data de encerramento<input required type="date" min={schedule.starts_at || undefined} value={schedule.ends_at} onChange={(e) => setSchedule((s) => ({ ...s, ends_at: e.target.value }))} className={inputCls} /></label>
          <p className="text-xs text-muted-foreground md:col-span-2">A coleção será exibida entre essas datas, inclusive, e ficará oculta automaticamente após o encerramento.</p>
        </div> : <p className="mt-2 text-xs text-muted-foreground">Coleções fixas não exibem selo nem datas na loja.</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-gold">{editing ? "Salvar alterações" : "Adicionar"}</button>
        {editing && <button type="button" onClick={resetForm} className="border px-4 py-2 text-sm text-muted-foreground">Cancelar edição</button>}
      </div>
    </form>
    {loading ? <p className="mt-8 text-muted-foreground">Carregando...</p> : <ul className="mt-8">{parents.map((c, i) => <div key={c.id}>{renderRow(c, i, parents)}<ul>{categories.filter((sub) => sub.parent_id === c.id).map((sub, j, arr) => renderRow(sub, j, arr))}</ul></div>)}{categories.filter((c) => c.parent_id && !parents.some((p) => p.id === c.parent_id)).map((c, i, arr) => renderRow(c, i, arr))}</ul>}
  </div>;
}
