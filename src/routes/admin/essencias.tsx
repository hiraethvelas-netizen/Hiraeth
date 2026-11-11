import { EssenceNotesFields } from "@/components/admin/EssenceNotesFields";
import { emptyNotes, essenceNotesPayload, notesDraft, type EssenceNotes } from "@/lib/fragrance";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { essenceUnit, type StockUnit } from "@/lib/candle-recipes";

type Essence = EssenceNotes & { id: string; name: string; stock_ml: number; minimum_stock_ml: number; target_stock_ml: number; stock_unit?: StockUnit; supplier: string | null; notes: string | null; active: boolean };
type Product = { id: string; name: string; stock: number; variants?: unknown };
type Recipe = { id: string; product_id: string; essence_id: string; quantity_ml: number; recipe_id?: string; products?: { name: string; stock: number } | null };

export const Route = createFileRoute("/admin/essencias")({
  head: () => ({ meta: [{ title: "Estoque de essências — Admin Hiraeth" }] }),
  component: AdminEssencias,
});

const blank = { name: "", stock_ml: "0", minimum_stock_ml: "10", target_stock_ml: "50", supplier: "", notes: "", stock_unit: "g" as StockUnit };

function AdminEssencias() {
  const db = supabase as any;
  const [essences, setEssences] = useState<Essence[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [aromaNotes, setAromaNotes] = useState(emptyNotes);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const [editingBalance, setEditingBalance] = useState<number | null>(null);
  const [selectedEssence, setSelectedEssence] = useState("");
  const [recipeProduct, setRecipeProduct] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState("");
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [reportMode, setReportMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, p, r, v] = await Promise.all([
      db.from("essences").select("*").order("name"),
      supabase.from("products").select("id,name,stock,variants").order("name"),
      db.from("product_essences").select("*, products(name,stock)").order("created_at"),
      db.from("product_variant_essences").select("product_id,recipe_id,essence_id,quantity"),
    ]);
    if (e.error || p.error || r.error || v.error) {
      toast.error("Não foi possível carregar o estoque. Confira a configuração das tabelas e tente novamente.");
    } else {
      setEssences(e.data ?? []); setProducts((p.data ?? []) as Product[]); setRecipes([...(r.data ?? []), ...(v.data ?? []).map((row: { product_id: string; recipe_id: string; essence_id: string; quantity: number }) => ({ ...row, id: row.recipe_id + ":" + row.essence_id, quantity_ml: Number(row.quantity) }))]);
      if (!selectedEssence && e.data?.length) setSelectedEssence(e.data[0].id);
    }
    setLoading(false);
  }, [db, selectedEssence]);

  useEffect(() => { void load(); }, [load]);

  const low = useMemo(() => essences.filter(e => e.active && Number(e.stock_ml) <= Number(e.minimum_stock_ml)), [essences]);
  const filtered = useMemo(() => essences.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) && (!reportMode || Number(e.stock_ml) < Number(threshold))), [essences, search, reportMode, threshold]);
  const usage = recipes.filter(r => r.essence_id === selectedEssence);
  const selected = essences.find(e => e.id === selectedEssence);

  function edit(e: Essence) {
    setEditingId(e.id);
    setEditingBalance(Number(e.stock_ml));
    setAromaNotes(notesDraft(e));
    setForm({ name: e.name, stock_ml: String(e.stock_ml), minimum_stock_ml: String(e.minimum_stock_ml), target_stock_ml: String(e.target_stock_ml), supplier: e.supplier ?? "", notes: e.notes ?? "", stock_unit: essenceUnit(e) });
  }
  function resetForm() { setEditingId(null); setEditingBalance(null); setForm(blank); setAromaNotes(emptyNotes); }

  useEffect(() => {
    if (!editingId) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    editNameRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [editingId]);

  async function saveEssence(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...essenceNotesPayload(form.name, aromaNotes), name: form.name.trim(), stock_ml: Number(form.stock_ml), stock_unit: form.stock_unit, minimum_stock_ml: Number(form.minimum_stock_ml), target_stock_ml: Number(form.target_stock_ml), supplier: form.supplier || null, notes: form.notes || null, updated_at: new Date().toISOString() };
    if (!payload.name || [payload.stock_ml, payload.minimum_stock_ml, payload.target_stock_ml].some(value => !Number.isFinite(value) || value < 0)) { toast.error("Confira o nome e as quantidades."); return; }
    if (!aromaNotes.is_pure && ![aromaNotes.top, aromaNotes.heart, aromaNotes.base].some(value => value.trim())) { toast.error("Informe as notas da essência composta."); return; }
    setSaving(true);
    const balanceChanged = editingId !== null && payload.stock_ml !== editingBalance;
    const { stock_ml, stock_unit: _stockUnit, ...details } = payload;
    let result;
    if (editingId) {
      let update = db.from("essences").update(balanceChanged ? { ...details, stock_ml } : details).eq("id", editingId);
      if (balanceChanged) update = update.eq("stock_ml", editingBalance);
      result = await update.select("id").maybeSingle();
    } else {
      result = await db.from("essences").insert(payload);
    }
    setSaving(false);
    if (result.error) { toast.error(result.error.message.includes("unique") ? "Já existe uma essência com esse nome." : "Erro ao salvar essência: " + result.error.message); return; }
    if (editingId && !result.data) { toast.error("O saldo mudou desde que você abriu a edição. Atualize o estoque e confira o saldo antes de salvar novamente."); return; }
    toast.success(editingId ? "Essência atualizada." : "Essência cadastrada."); resetForm(); await load();
  }

  async function addRecipe(event: React.FormEvent) {
    event.preventDefault();
    const quantity = Number(recipeQuantity);
    if (!recipeProduct || !selectedEssence || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Selecione uma vela e informe a quantidade na unidade do estoque por vela."); return; }
    const result = await db.from("product_essences").upsert({ product_id: recipeProduct, essence_id: selectedEssence, quantity_ml: quantity }, { onConflict: "product_id,essence_id" });
    if (result.error) { toast.error("Não foi possível salvar a fórmula: " + result.error.message); return; }
    toast.success("Essência vinculada à fórmula da vela."); setRecipeQuantity(""); await load();
  }

  async function removeRecipe(recipe: Recipe) {
    if (!confirm("Remover esta essência da fórmula da vela?")) return;
    const { error } = await db.from("product_essences").delete().eq("id", recipe.id);
    if (error) toast.error("Não foi possível remover."); else { toast.success("Ingrediente removido da fórmula."); await load(); }
  }

  async function movement(kind: "purchase" | "adjustment" | "loss") {
    if (!selected || !selectedEssence) return;
    const unit = essenceUnit(selected);
    const raw = prompt(kind === "purchase" ? `Quantos ${unit} entraram na compra?` : kind === "loss" ? `Quantos ${unit} foram perdidos?` : `Qual será o novo saldo total em ${unit}?`);
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || (kind !== "adjustment" && value === 0)) { toast.error("Informe uma quantidade válida."); return; }
    const result = await db.rpc("record_essence_stock_movement", {
      p_essence_id: selected.id,
      p_movement_type: kind,
      p_quantity: value,
      p_expected_balance: kind === "adjustment" ? Number(selected.stock_ml) : null,
    });
    if (result.error) { toast.error("Não foi possível atualizar o saldo: " + result.error.message); return; }
    toast.success("Estoque atualizado."); await load();
  }

  function variantLabel(recipe: Recipe) {
    const variants = products.find(product => product.id === recipe.product_id)?.variants;
    if (!Array.isArray(variants)) return "Tamanho cadastrado";
    const variant = variants.find((row: unknown) => typeof row === "object" && row !== null && "recipe_id" in row && row.recipe_id === recipe.recipe_id);
    return variant && typeof variant.label === "string" ? variant.label : "Tamanho cadastrado";
  }

  const input = "mt-1 w-full border bg-[#fbf7eb] px-3 py-2 text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-primary focus:outline-none";
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-primary">Matérias-primas</p><h1 className="mt-2 text-4xl text-foreground">Estoque de essências</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre essências, acompanhe saldos e descubra exatamente quais velas usam cada aroma.</p></div><button onClick={() => void load()} className="border px-4 py-2 text-sm hover:border-primary">Atualizar ↻</button></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Essências cadastradas</p><p className="mt-2 text-3xl text-primary">{essences.length}</p></div><div className="border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Precisam de reposição</p><p className="mt-2 text-3xl text-destructive">{low.length}</p></div><div className="border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Fórmulas vinculadas</p><p className="mt-2 text-3xl text-primary">{recipes.length}</p></div></div>
    {low.length > 0 && <section className="mt-6 border border-destructive/40 bg-card p-5"><h2 className="text-lg text-destructive">Atenção: estoque baixo</h2><p className="mt-1 text-sm text-muted-foreground">Essências no limite mínimo ou abaixo dele.</p><div className="mt-3 flex flex-wrap gap-2">{low.map(e => <span key={e.id} className="border border-destructive/30 px-3 py-2 text-sm">{e.name}: {Number(e.stock_ml).toLocaleString("pt-BR")} {essenceUnit(e)}</span>)}</div></section>}
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section role={editingId ? "dialog" : undefined} aria-modal={editingId ? true : undefined}
        aria-label={editingId ? "Editar essência" : undefined}
        className={editingId
          ? "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-6"
          : "border bg-card p-5"}>
        <div className={editingId
          ? "max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-primary/40 bg-background p-5 shadow-2xl sm:p-7"
          : ""}>
        <h2 className="text-xl text-foreground">{editingId ? "Editar essência" : "Cadastrar essência"}</h2>
        <form onSubmit={saveEssence} className="mt-4 space-y-3">
        <label className="block text-sm text-muted-foreground">Nome da essência<input ref={editNameRef} required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Ex.: Baunilha" className={input}/></label>
        <p className="text-sm text-muted-foreground">Unidade do estoque: <strong>{form.stock_unit}</strong></p>
        <p className="text-xs text-muted-foreground">{editingId && form.stock_unit === "ml" ? "Cadastro antigo em ml: os valores não devem ser interpretados como gramas. A conversão precisa dos pesos reais e da revisão das receitas vinculadas." : "Todos os novos cadastros são em gramas (g)."}</p>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm text-muted-foreground">Saldo atual ({form.stock_unit})<input type="number" min="0" step="0.001" required value={form.stock_ml} onChange={e => setForm({...form,stock_ml:e.target.value})} className={input}/></label><label className="text-sm text-muted-foreground">Alerta abaixo de ({form.stock_unit})<input type="number" min="0" step="0.001" required value={form.minimum_stock_ml} onChange={e => setForm({...form,minimum_stock_ml:e.target.value})} className={input}/></label><label className="text-sm text-muted-foreground">Estoque ideal ({form.stock_unit})<input type="number" min="0" step="0.001" required value={form.target_stock_ml} onChange={e => setForm({...form,target_stock_ml:e.target.value})} className={input}/></label></div>
        <label className="block text-sm text-muted-foreground">Fornecedor (opcional)<input value={form.supplier} onChange={e => setForm({...form,supplier:e.target.value})} className={input}/></label><label className="block text-sm text-muted-foreground">Observações<textarea rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className={input}/></label>
        <EssenceNotesFields value={aromaNotes} onChange={setAromaNotes} inputClass={input} />
        <div className="flex flex-wrap gap-2"><button className="btn-gold" disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar essência"}</button>{editingId && <button type="button" onClick={resetForm} className="border px-4 py-2">Cancelar edição</button>}</div>
      </form></div></section>
      <section className="border bg-card p-5"><h2 className="text-xl text-foreground">Consultar essência</h2><p className="mt-1 text-sm text-muted-foreground">Escolha uma essência para ver todas as velas que levam esse aroma.</p><select value={selectedEssence} onChange={e=>setSelectedEssence(e.target.value)} className={input}><option value="">Selecione uma essência</option>{essences.map(e=><option key={e.id} value={e.id}>{e.name} — {Number(e.stock_ml).toLocaleString("pt-BR")} {essenceUnit(e)}</option>)}</select>
        {selected && <><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void movement("purchase")} className="border px-3 py-2 text-sm hover:border-primary">+ Registrar compra</button><button onClick={()=>void movement("adjustment")} className="border px-3 py-2 text-sm hover:border-primary">Ajustar saldo</button><button onClick={()=>void movement("loss")} className="border px-3 py-2 text-sm hover:border-primary">Registrar perda</button><button onClick={()=>edit(selected)} className="border px-3 py-2 text-sm hover:border-primary">Editar cadastro</button></div><h3 className="mt-5 font-medium text-foreground">Velas que usam {selected.name}</h3><div className="mt-2 space-y-2">{usage.length ? usage.map(r=><div key={r.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><div><p className="text-foreground">{r.products?.name ?? products.find(p=>p.id===r.product_id)?.name ?? "Produto"}</p><p className="text-xs text-muted-foreground">{Number(r.quantity_ml).toLocaleString("pt-BR")} {essenceUnit(selected)} por vela{r.recipe_id ? ` · ${variantLabel(r)}` : " · Receita padrão"}</p></div>{r.recipe_id ? <a href="/admin/produtos" className="text-xs text-primary underline">Editar no produto</a> : <button onClick={()=>void removeRecipe(r)} className="text-xs text-destructive">Remover</button>}</div>) : <p className="text-sm text-muted-foreground">Ainda não há velas vinculadas a esta essência.</p>}</div></>}
      </section>
    </div>
    <section className="mt-8 border bg-card p-5"><h2 className="text-xl text-foreground">Lista de compras</h2><p className="mt-1 text-sm text-muted-foreground">Filtre por um limite específico para montar sua lista de reposição.</p><div className="mt-4 flex flex-wrap gap-3"><label className="text-sm text-muted-foreground">Mostrar essências com menos de<input type="number" min="0" step="0.001" value={threshold} onChange={e=>setThreshold(e.target.value)} className={input}/></label><span className="self-end text-sm text-muted-foreground">na unidade de cada essência (g ou ml)</span><button onClick={()=>setReportMode(!reportMode)} className="self-end border px-4 py-2 text-sm">{reportMode ? "Mostrar todas" : "Gerar lista"}</button><button onClick={()=>{const lines=filtered.map(e=>`${e.name}: ${Number(e.stock_ml).toLocaleString("pt-BR")} ${essenceUnit(e)} restantes — comprar ${Math.max(0,Number(e.target_stock_ml)-Number(e.stock_ml)).toLocaleString("pt-BR")} ${essenceUnit(e)}`); if(!lines.length){toast.info("Nenhuma essência encontrada para esse filtro.");return;} const text="LISTA DE COMPRAS — HIRAETH\n\n"+lines.join("\n"); void navigator.clipboard.writeText(text).then(()=>toast.success("Lista de compras copiada!")).catch(()=>toast.error("Não foi possível copiar a lista."));}} className="self-end border px-4 py-2 text-sm">Copiar lista</button></div>
      <div className="mt-4 space-y-2">{filtered.length ? filtered.map(e=><div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="text-foreground">{e.name}</p><p className="text-xs text-muted-foreground">{e.supplier ? `Fornecedor: ${e.supplier} · ` : ""}Mínimo: {Number(e.minimum_stock_ml).toLocaleString("pt-BR")} {essenceUnit(e)}</p></div><div className="text-right"><p className={Number(e.stock_ml)<=Number(e.minimum_stock_ml)?"font-semibold text-destructive":"text-foreground"}>{Number(e.stock_ml).toLocaleString("pt-BR")} {essenceUnit(e)}</p><p className="text-xs text-muted-foreground">Repor até {Number(e.target_stock_ml).toLocaleString("pt-BR")} {essenceUnit(e)}</p></div></div>) : <p className="text-sm text-muted-foreground">Nenhuma essência corresponde ao filtro.</p>}</div>
    </section>
    {loading && <p className="mt-4 text-sm text-muted-foreground">Atualizando dados...</p>}
  </div>;
}
