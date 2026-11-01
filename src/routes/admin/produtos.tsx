import { EssenceNotesFields } from "@/components/admin/EssenceNotesFields";
import { emptyNotes, essenceNotesPayload } from "@/lib/fragrance";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import { validateVariantSetup, variantSetupFrom, variantTotalStock, type VariantSetup } from "@/lib/product-variants";

type Product = Tables<"products">;
type Category = Tables<"categories"> & { parent_id?: string | null };
type Essence = { id: string; name: string; stock_ml: number; notes: string | null; top_notes: string[]; heart_notes: string[]; base_notes: string[]; active: boolean };

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin Hiraeth" }] }),
  component: AdminProdutos,
});

const emptyForm = {
  name: "", description: "", category_id: "", price: "", sale_price: "",
  stock: "0", sku: "", fragrance: "", images: [] as string[], status: "draft",
  product_type: "candle", product_badge: "",
};

function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<VariantSetup>(() => variantSetupFrom([]));
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const db = supabase as any;
  const [essences, setEssences] = useState<Essence[]>([]);
  const [aromaSearch, setAromaSearch] = useState("");
  const [selectedAroma, setSelectedAroma] = useState("");
  const [aromaQuantity, setAromaQuantity] = useState("");
  const [newAromaName, setNewAromaName] = useState("");
  const [newNotes, setNewNotes] = useState(emptyNotes);
  const [newStock, setNewStock] = useState("0");
  const [saving, setSaving] = useState(false);
  const [savingAroma, setSavingAroma] = useState(false);
  const [productAromas, setProductAromas] = useState<{essence_id:string;quantity_ml:number;name:string}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods, error: productsError }, { data: cats, error: categoriesError }, { data: aromaData, error: aromaError }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("position"),
      db.from("essences").select("*").eq("active", true).order("name"),
    ]);
    if (productsError || categoriesError) {
      setLoadError("Não foi possível carregar produtos e categorias. Verifique a conexão e suas permissões.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setProducts(prods ?? []);
    setCategories((cats ?? []) as Category[]);
    setEssences((aromaData ?? []) as Essence[]);
    if (aromaError) toast.error("Não foi possível carregar as essências do estoque.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function startEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", category_id: p.category_id ?? "",
      price: String(p.price), sale_price: p.sale_price != null ? String(p.sale_price) : "",
      stock: String(p.stock), sku: p.sku ?? "", fragrance: p.fragrance ?? "",
      images: p.images ?? [], status: p.status,
      product_type: (p as Product & { product_type?: string }).product_type ?? (/camiseta|t-shirt|roupa|vestuário/i.test(p.name) ? "artifact" : "candle"), product_badge: (p as any).product_badge ?? "",
    });
    setVariants(variantSetupFrom(p.variants));
    const { data, error } = await db.from("product_essences").select("essence_id,quantity_ml,essences(name)").eq("product_id", p.id);
    if (error) { toast.error("Não foi possível carregar a receita. Tente novamente antes de editar."); return; }
    setProductAromas((data ?? []).map((r:any) => ({essence_id:r.essence_id,quantity_ml:Number(r.quantity_ml),name:r.essences?.name ?? "Aroma"})));
    setShowForm(true);
  }

  function startNew() { setEditing(null); setForm({ ...emptyForm }); setVariants(variantSetupFrom([])); setProductAromas([]); setSelectedAroma(""); setAromaQuantity(""); setAromaSearch(""); setNewAromaName(""); setNewNotes(emptyNotes); setNewStock("0"); setShowForm(true); }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error("Escolha apenas arquivos de imagem."); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error("Cada imagem deve ter no máximo 10 MB."); continue; }
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) { toast.error(`Falha ao enviar ${file.name}: ${error.message}`); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      added.push(data.publicUrl);
    }
    if (added.length) {
      setForm((current) => ({ ...current, images: [...current.images, ...added] }));
      toast.success(added.length === 1 ? "Imagem adicionada." : `${added.length} imagens adicionadas.`);
    }
    setUploading(false);
  }

  async function uploadVariantPhoto(file: File): Promise<string> {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Use uma foto JPG, PNG, WebP ou GIF.");
    if (file.size > 10 * 1024 * 1024) throw new Error("A foto deve ter até 10 MB.");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-variacao-${safeName}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (error) throw new Error("Falha ao enviar foto da variação: " + error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    if (!data.publicUrl) throw new Error("Não foi possível gerar o link da foto.");
    return data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const variantError = validateVariantSetup(variants);
    if (variantError) { toast.error(variantError); return; }
    const variantRows = variants.legacy ?? variants.rows;
    const managed = variants.legacy === null && variants.rows.length > 0;
    const lowestPrice = managed ? Math.min(...variants.rows.map(row => row.sale_price ?? row.price)) : Number(form.price) || 0;
    const finalStock = managed ? variantTotalStock(variants, 0) : Math.max(0, Number(form.stock) || 0);
    const payload = {
      product_type: form.product_type,
      name: form.name, slug: editing ? editing.slug : slugify(form.name),
      description: form.description || null, category_id: form.category_id || null,
      price: lowestPrice, sale_price: managed ? null : form.sale_price ? Number(form.sale_price) : null,
      stock: finalStock, sku: form.sku || null,
      fragrance: form.fragrance || null, images: form.images, status: form.status,
      weight_grams: editing?.weight_grams ?? null,
      dimensions: editing?.dimensions ?? null, variants: variantRows, product_badge: form.product_badge || null,
    };
    if (saving) return;
    setSaving(true);
    try {
      const result = editing
        ? await db.from("products").update(payload).eq("id", editing.id).select("id").single()
        : await db.from("products").insert(payload).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Não foi possível confirmar o produto salvo.");
      if (form.product_type === "candle") {
        const recipe = await db.rpc("set_product_essences", { p_product_id: result.data.id, p_ingredients: productAromas.map(aroma => ({ essence_id: aroma.essence_id, quantity_ml: aroma.quantity_ml })) });
        if (recipe.error) {
          setEditing({ ...payload, id: result.data.id, slug: payload.slug } as unknown as Product);
          toast.error("Os dados do produto foram salvos, mas a receita não foi atualizada. Confira a atualização do banco e tente salvar novamente.");
          return;
        }
      }
      toast.success(editing ? "Produto atualizado." : "Produto criado.");
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto. Confira a atualização do banco e suas permissões.");
    } finally { setSaving(false); }
  }

  async function createAroma() {
    const name = newAromaName.trim();
    const stock = Number(newStock);
    if (!name || !Number.isFinite(stock) || stock < 0) { toast.error("Informe o nome e um saldo válido para a essência."); return; }
    if (!newNotes.is_pure && ![newNotes.top, newNotes.heart, newNotes.base].some(value => value.trim())) { toast.error("Informe a pirâmide olfativa da essência composta."); return; }
    setSavingAroma(true);
    try {
      const { data, error } = await db.from("essences").insert({ name, stock_ml: stock, minimum_stock_ml: 10, target_stock_ml: 50, ...essenceNotesPayload(name, newNotes), active: true }).select("*").single();
      if (error || !data) throw error ?? new Error("Não foi possível confirmar a essência.");
      setEssences(current => [...current, data]); setSelectedAroma(data.id); setNewAromaName(""); setNewNotes(emptyNotes); setNewStock("0");
      toast.success("Essência cadastrada no estoque. Informe a quantidade usada na vela.");
    } catch { toast.error("Não foi possível cadastrar a essência. Confira se o nome já existe e se a atualização do banco foi aplicada."); }
    finally { setSavingAroma(false); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remover "${name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o produto."); return; }
    toast.success("Produto removido."); load();
  }

  const inputCls = "w-full border bg-[#fbf7eb] px-3 py-2 text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-primary focus:outline-none";
  const parentCategories = categories.filter((c) => !c.parent_id);
  const categoryLabel = (id: string | null) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return "—";
    const parent = cat.parent_id ? categories.find((c) => c.id === cat.parent_id) : null;
    return parent ? `${parent.name} / ${cat.name}` : cat.name;
  };

  return <div>
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-4xl text-foreground">Produtos</h1><p className="mt-2 text-sm text-muted-foreground">Catálogo, imagens, estoque e informações de cada peça.</p></div>
      <button onClick={startNew} className="btn-gold">+ Novo produto</button>
    </div>
    {loadError && <div className="mt-6 border bg-card p-4 text-foreground"><p>{loadError}</p><button onClick={load} className="btn-gold mt-3">Tentar novamente</button></div>}
    {showForm && <form onSubmit={save} className="mt-6 space-y-5 border bg-card p-6">
      <p className="font-display text-xl text-primary">{editing ? `Editar: ${editing.name}` : "Novo produto"}</p>
      <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 text-sm text-foreground">Este produto é</legend><label className="flex items-center gap-2 text-sm"><input type="radio" name="product-type" checked={form.product_type === "candle"} onChange={() => setForm({ ...form, product_type: "candle" })} />Uma vela</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="product-type" checked={form.product_type === "artifact"} onChange={() => setForm({ ...form, product_type: "artifact" })} />Um artefato</label></fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted-foreground">Nome<input required placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Categoria / subcategoria<select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">Sem categoria</option>{parentCategories.map((c) => <optgroup key={c.id} label={c.name}><option value={c.id}>{c.name} (categoria)</option>{categories.filter((sub) => sub.parent_id === c.id).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}</optgroup>)}{categories.filter((c) => c.parent_id && !parentCategories.some((p) => p.id === c.parent_id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm text-muted-foreground">Preço (R$)<input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Preço promocional (R$)<input type="number" step="0.01" min="0" placeholder="Opcional" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        {variants.groups.length === 0 && variants.legacy === null && <label className="text-sm text-muted-foreground">Quantidade em estoque<input required type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={`mt-1 ${inputCls}`} /></label>}
        
        {/* Peso, cor e tamanho são cadastrados diretamente em Variações. */}
        <label className="text-sm text-muted-foreground">SKU<input placeholder="Código interno (opcional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        
        <label className="text-sm text-muted-foreground">Família olfativa<input list="fragrance-families" placeholder="Ex.: Floral ambarado" value={form.fragrance} onChange={(e) => setForm({ ...form, fragrance: e.target.value })} className={`mt-1 ${inputCls}`} /><datalist id="fragrance-families"><option value="Floral" /><option value="Floral ambarado" /><option value="Amadeirado" /><option value="Amadeirado aromático" /><option value="Oriental / ambarado" /><option value="Cítrico" /><option value="Frutado" /><option value="Gourmand" /><option value="Fresco" /><option value="Floral frutado" /><option value="Chipre" /><option value="Aromático" /></datalist></label>
        <label className="text-sm text-muted-foreground">Selo do produto<select value={form.product_badge} onChange={(e) => setForm({ ...form, product_badge: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">Sem selo</option><option value="new">Novidade</option><option value="limited">Edição limitada</option><option value="bestseller">Mais vendido</option></select></label>
        <label className="text-sm text-muted-foreground">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
      </div>
      {form.product_type === "candle" && <section className="space-y-4 border border-primary/20 p-4">
        <div><h3 className="text-lg text-foreground">Aroma da vela — combinação de essências</h3><p className="text-xs text-muted-foreground">Pesquise essências já cadastradas ou cadastre uma nova aqui. Informe quantos ml de cada aroma entram em uma vela; as quantidades são internas e não aparecem para clientes.</p></div>
        <label className="block text-sm text-muted-foreground">Pesquisar aroma no estoque<input value={aromaSearch} onChange={e=>setAromaSearch(e.target.value)} placeholder="Digite o nome do aroma..." className={inputCls}/></label>
        <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <label className="text-sm text-muted-foreground">Aroma<select value={selectedAroma} onChange={e=>setSelectedAroma(e.target.value)} className={inputCls}><option value="">Selecione um aroma</option>{essences.filter(a=>a.name.toLowerCase().includes(aromaSearch.toLowerCase())).map(a=><option key={a.id} value={a.id}>{a.name} — {Number(a.stock_ml).toLocaleString("pt-BR")} ml no estoque</option>)}</select></label>
          <label className="text-sm text-muted-foreground">Quantidade (ml)<input type="number" min="0.001" step="0.001" value={aromaQuantity} onChange={e=>setAromaQuantity(e.target.value)} placeholder="Ex.: 8" className={inputCls}/></label>
          <button type="button" className="btn-gold self-end" onClick={()=>{const a=essences.find(x=>x.id===selectedAroma);const q=Number(aromaQuantity);if(!a||!Number.isFinite(q)||q<=0){toast.error("Selecione um aroma e informe a quantidade em ml.");return;}setProductAromas(prev=>[...prev.filter(x=>x.essence_id!==a.id),{essence_id:a.id,quantity_ml:q,name:a.name}]);setSelectedAroma("");setAromaQuantity("");}}>Adicionar aroma</button>
        </div>
        <details className="border p-3"><summary className="cursor-pointer text-sm text-primary">+ Cadastrar um aroma novo</summary><div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-muted-foreground">Nome do aroma<input value={newAromaName} onChange={e=>setNewAromaName(e.target.value)} placeholder="Ex.: Baunilha" className={inputCls}/></label>
          <label className="text-sm text-muted-foreground">Saldo inicial (ml)<input type="number" min="0" step="0.001" value={newStock} onChange={event => setNewStock(event.target.value)} className={inputCls} /></label>
          <div className="md:col-span-2"><EssenceNotesFields value={newNotes} onChange={setNewNotes} inputClass={inputCls} /></div>
          <button type="button" disabled={savingAroma} className="btn-gold md:col-span-2" onClick={() => void createAroma()}>{savingAroma ? "Salvando..." : "Salvar essência no estoque"}</button>
        </div></details>
        {productAromas.length>0&&<div className="space-y-2">{productAromas.map(a=><div key={a.essence_id} className="flex items-center justify-between border-b py-2 text-sm"><span>{a.name} <span className="text-muted-foreground">· {a.quantity_ml} ml por vela (interno)</span></span><button type="button" onClick={()=>setProductAromas(prev=>prev.filter(x=>x.essence_id!==a.essence_id))} className="text-destructive">Remover</button></div>)}</div>}
      </section>}
      <ProductVariantsEditor value={variants} onChange={setVariants} basePrice={Number(form.price) || 0} onUpload={uploadVariantPhoto} disabled={saving || uploading || savingAroma} />
      <label className="block text-sm text-muted-foreground">Descrição<textarea placeholder="Conte a história, materiais e detalhes do produto..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
      <div className="space-y-3">
        <div><p className="text-sm text-foreground">Fotos do produto</p><p className="text-xs text-muted-foreground">Selecione imagens do celular ou computador. A primeira imagem será a capa. JPG, PNG, WEBP ou GIF; até 10 MB por foto.</p></div>
        <label className="inline-flex cursor-pointer items-center border px-4 py-2 text-sm text-foreground hover:border-primary"><span>{uploading ? "Enviando imagens..." : "+ Escolher imagens"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading} onChange={(e) => { void uploadImages(e.target.files); e.currentTarget.value = ""; }} className="sr-only" /></label>
        {form.images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{form.images.map((url, i) => <div key={url} className="relative border p-2"><img src={url} alt={`Foto ${i + 1} de ${form.name || "produto"}`} className="h-32 w-full object-cover" /><p className="mt-1 text-xs text-muted-foreground">{i === 0 ? "Imagem principal" : `Imagem ${i + 1}`}</p><div className="mt-2 flex gap-2"><button type="button" disabled={i === 0} onClick={() => setForm({ ...form, images: [url, ...form.images.filter((x) => x !== url)] })} className="text-xs text-primary disabled:opacity-30">Tornar capa</button><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== url) })} className="text-xs text-destructive">Remover</button></div></div>)}</div>}
      </div>
      <div className="flex gap-3"><button type="submit" disabled={uploading || saving || savingAroma} className="btn-gold disabled:opacity-50">{saving ? "Salvando..." : "Salvar produto"}</button><button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 text-sm text-muted-foreground hover:text-primary">Cancelar</button></div>
    </form>}
    {loading ? <p className="mt-8 text-muted-foreground">Carregando...</p> : products.length === 0 ? <p className="mt-8 text-muted-foreground">Nenhum produto cadastrado ainda.</p> : <div className="mt-8 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-widest text-muted-foreground"><th className="py-2 pr-4">Produto</th><th className="py-2 pr-4">Categoria</th><th className="py-2 pr-4">Preço</th><th className="py-2 pr-4">Estoque</th><th className="py-2 pr-4">Status</th><th className="py-2"></th></tr></thead><tbody className="divide-y">{products.map((p) => <tr key={p.id}><td className="py-3 pr-4 text-foreground"><div className="flex items-center gap-3">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-12 w-10 object-cover" />}<span>{p.name}</span></div></td><td className="py-3 pr-4 text-muted-foreground">{categoryLabel(p.category_id)}</td><td className="py-3 pr-4">{brl(Number(p.sale_price ?? p.price))}</td><td className={`py-3 pr-4 ${p.stock <= 5 ? "text-destructive font-semibold" : ""}`}>{p.stock}{p.stock <= 5 ? " · Baixo" : ""}</td><td className="py-3 pr-4 text-muted-foreground">{p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}</td><td className="py-3 text-right whitespace-nowrap"><button onClick={() => startEdit(p)} className="mr-3 text-muted-foreground hover:text-primary">Editar</button><button onClick={() => remove(p.id, p.name)} className="text-muted-foreground hover:text-destructive">Remover</button></td></tr>)}</tbody></table></div>}
  </div>;
}
