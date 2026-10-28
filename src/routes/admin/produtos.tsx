import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

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
  dimensions: "", variantsJson: "[]",
};

function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const db = supabase as any;
  const [essences, setEssences] = useState<Essence[]>([]);
  const [aromaSearch, setAromaSearch] = useState("");
  const [selectedAroma, setSelectedAroma] = useState("");
  const [aromaQuantity, setAromaQuantity] = useState("");
  const [newAromaName, setNewAromaName] = useState("");
  const [newTop, setNewTop] = useState("");
  const [newHeart, setNewHeart] = useState("");
  const [newBase, setNewBase] = useState("");
  const [productAromas, setProductAromas] = useState<{essence_id:string;quantity_ml:number;name:string}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods, error: productsError }, { data: cats, error: categoriesError }, { data: aromaData }] = await Promise.all([
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
      dimensions: p.dimensions ?? "", variantsJson: JSON.stringify((p as any).variants ?? [], null, 2),
    });
    const { data } = await db.from("product_essences").select("essence_id,quantity_ml,essences(name)").eq("product_id", p.id);
    setProductAromas((data ?? []).map((r:any) => ({essence_id:r.essence_id,quantity_ml:Number(r.quantity_ml),name:r.essences?.name ?? "Aroma"})));
    setShowForm(true);
  }

  function startNew() { setEditing(null); setForm(emptyForm); setProductAromas([]); setSelectedAroma(""); setAromaQuantity(""); setAromaSearch(""); setNewAromaName(""); setNewTop(""); setNewHeart(""); setNewBase(""); setShowForm(true); }

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name, slug: editing ? editing.slug : slugify(form.name),
      description: form.description || null, category_id: form.category_id || null,
      price: Number(form.price) || 0, sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Math.max(0, Number(form.stock) || 0), sku: form.sku || null,
      fragrance: form.fragrance || null, images: form.images, status: form.status,
      dimensions: form.dimensions || null,
      variants: (() => { try { const parsed = JSON.parse((form as any).variantsJson || "[]"); if (!Array.isArray(parsed)) throw new Error("As variações precisam ser uma lista."); return parsed; } catch { toast.error("Revise o JSON das variações antes de salvar."); throw new Error("Variações inválidas"); } })(),
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) toast.error(error.message.includes("unique") ? "Já existe um produto com esse nome/link." : `Erro ao salvar: ${error.message}`);
    else {
      const saved = editing ? editing.id : (await db.from("products").select("id").eq("slug", slugify(form.name)).maybeSingle()).data?.id;
      if (saved) { await db.from("product_essences").delete().eq("product_id", saved); if (productAromas.length) await db.from("product_essences").insert(productAromas.map(a=>({product_id:saved,essence_id:a.essence_id,quantity_ml:a.quantity_ml}))); }
      toast.success(editing ? "Produto atualizado." : "Produto criado."); setShowForm(false); load(); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remover "${name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o produto."); return; }
    toast.success("Produto removido."); load();
  }

  const inputCls = "w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted-foreground">Nome<input required placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Categoria / subcategoria<select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">Sem categoria</option>{parentCategories.map((c) => <optgroup key={c.id} label={c.name}><option value={c.id}>{c.name} (categoria)</option>{categories.filter((sub) => sub.parent_id === c.id).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}</optgroup>)}{categories.filter((c) => c.parent_id && !parentCategories.some((p) => p.id === c.parent_id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm text-muted-foreground">Preço (R$)<input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Preço promocional (R$)<input type="number" step="0.01" min="0" placeholder="Opcional" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Quantidade em estoque<input required type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        
        <label className="text-sm text-muted-foreground">Tamanho<input placeholder="Ex.: 250 g, 100 ml, tamanho P" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">SKU<input placeholder="Código interno (opcional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        
        <label className="text-sm text-muted-foreground">Família olfativa<input list="fragrance-families" placeholder="Ex.: Floral ambarado" value={form.fragrance} onChange={(e) => setForm({ ...form, fragrance: e.target.value })} className={`mt-1 ${inputCls}`} /><datalist id="fragrance-families"><option value="Floral" /><option value="Floral ambarado" /><option value="Amadeirado" /><option value="Amadeirado aromático" /><option value="Oriental / ambarado" /><option value="Cítrico" /><option value="Frutado" /><option value="Gourmand" /><option value="Fresco" /><option value="Floral frutado" /><option value="Chipre" /><option value="Aromático" /></datalist></label>
        <label className="text-sm text-muted-foreground">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
      </div>
      <section className="space-y-4 border border-primary/20 p-4">
        <div><h3 className="text-lg text-foreground">Receita da vela — essências e pirâmide olfativa</h3><p className="text-xs text-muted-foreground">Pesquise essências já cadastradas ou cadastre uma nova aqui. Informe quantos ml de cada aroma entram em uma vela; as quantidades são internas e não aparecem para clientes.</p></div>
        <label className="block text-sm text-muted-foreground">Pesquisar aroma no estoque<input value={aromaSearch} onChange={e=>setAromaSearch(e.target.value)} placeholder="Digite o nome do aroma..." className={inputCls}/></label>
        <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <label className="text-sm text-muted-foreground">Aroma<select value={selectedAroma} onChange={e=>setSelectedAroma(e.target.value)} className={inputCls}><option value="">Selecione um aroma</option>{essences.filter(a=>a.name.toLowerCase().includes(aromaSearch.toLowerCase())).map(a=><option key={a.id} value={a.id}>{a.name} — {Number(a.stock_ml).toLocaleString("pt-BR")} ml no estoque</option>)}</select></label>
          <label className="text-sm text-muted-foreground">Quantidade (ml)<input type="number" min="0.001" step="0.001" value={aromaQuantity} onChange={e=>setAromaQuantity(e.target.value)} placeholder="Ex.: 8" className={inputCls}/></label>
          <button type="button" className="btn-gold self-end" onClick={()=>{const a=essences.find(x=>x.id===selectedAroma);const q=Number(aromaQuantity);if(!a||q<=0){toast.error("Selecione um aroma e informe a quantidade em ml.");return;}setProductAromas(prev=>[...prev.filter(x=>x.essence_id!==a.id),{essence_id:a.id,quantity_ml:q,name:a.name}]);setSelectedAroma("");setAromaQuantity("");}}>Adicionar aroma</button>
        </div>
        <details className="border p-3"><summary className="cursor-pointer text-sm text-primary">+ Cadastrar um aroma novo</summary><div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-muted-foreground">Nome do aroma<input value={newAromaName} onChange={e=>setNewAromaName(e.target.value)} placeholder="Ex.: Baunilha" className={inputCls}/></label>
          <label className="text-sm text-muted-foreground">Notas de saída<input value={newTop} onChange={e=>setNewTop(e.target.value)} placeholder="Cítricos, bergamota..." className={inputCls}/></label>
          <label className="text-sm text-muted-foreground">Notas de corpo<input value={newHeart} onChange={e=>setNewHeart(e.target.value)} placeholder="Jasmim, rosa..." className={inputCls}/></label>
          <label className="text-sm text-muted-foreground">Notas de fundo<input value={newBase} onChange={e=>setNewBase(e.target.value)} placeholder="Baunilha, âmbar..." className={inputCls}/></label>
          <button type="button" className="btn-gold md:col-span-2" onClick={async()=>{if(!newAromaName.trim()){toast.error("Informe o nome do aroma.");return;}const {data,error}=await db.from("essences").insert({name:newAromaName.trim(),stock_ml:0,minimum_stock_ml:10,target_stock_ml:50,top_notes:newTop.split(",").map(s=>s.trim()).filter(Boolean),heart_notes:newHeart.split(",").map(s=>s.trim()).filter(Boolean),base_notes:newBase.split(",").map(s=>s.trim()).filter(Boolean),active:true}).select("*").single();if(error){toast.error("Não foi possível cadastrar o aroma: "+error.message);return;}setEssences(prev=>[...prev,data]);setSelectedAroma(data.id);setNewAromaName("");setNewTop("");setNewHeart("");setNewBase("");toast.success("Aroma cadastrado no estoque. Informe a quantidade usada para vinculá-lo.");}}>Salvar aroma no estoque</button>
        </div></details>
        {productAromas.length>0&&<div className="space-y-2">{productAromas.map(a=><div key={a.essence_id} className="flex items-center justify-between border-b py-2 text-sm"><span>{a.name} <span className="text-muted-foreground">· {a.quantity_ml} ml por vela (interno)</span></span><button type="button" onClick={()=>setProductAromas(prev=>prev.filter(x=>x.essence_id!==a.essence_id))} className="text-destructive">Remover</button></div>)}</div>}
      </section>
      <label className="block text-sm text-muted-foreground">Variações (JSON) — preço e estoque independentes<textarea rows={8} value={form.variantsJson} onChange={(e) => setForm({ ...form, variantsJson: e.target.value })} placeholder={'[{"key":"100g","type":"size","label":"100 g","price":49,"sale_price":null,"stock":10,"image":"https://..."}]' } className={`mt-1 ${inputCls} font-mono text-xs`} /><span className="mt-1 block text-xs">Cada variação pode ter key, type (size/house), label, price, sale_price, stock e image. Para o Chapéu Seletor, crie uma opção para Aleatória / casa surpresa e uma para cada casa.</span></label>
      <label className="block text-sm text-muted-foreground">Descrição<textarea placeholder="Conte a história, materiais e detalhes do produto..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
      <div className="space-y-3">
        <div><p className="text-sm text-foreground">Fotos do produto</p><p className="text-xs text-muted-foreground">Selecione imagens do celular ou computador. A primeira imagem será a capa. JPG, PNG, WEBP ou GIF; até 10 MB por foto.</p></div>
        <label className="inline-flex cursor-pointer items-center border px-4 py-2 text-sm text-foreground hover:border-primary"><span>{uploading ? "Enviando imagens..." : "+ Escolher imagens"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading} onChange={(e) => { void uploadImages(e.target.files); e.currentTarget.value = ""; }} className="sr-only" /></label>
        {form.images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{form.images.map((url, i) => <div key={url} className="relative border p-2"><img src={url} alt={`Foto ${i + 1} de ${form.name || "produto"}`} className="h-32 w-full object-cover" /><p className="mt-1 text-xs text-muted-foreground">{i === 0 ? "Imagem principal" : `Imagem ${i + 1}`}</p><div className="mt-2 flex gap-2"><button type="button" disabled={i === 0} onClick={() => setForm({ ...form, images: [url, ...form.images.filter((x) => x !== url)] })} className="text-xs text-primary disabled:opacity-30">Tornar capa</button><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== url) })} className="text-xs text-destructive">Remover</button></div></div>)}</div>}
      </div>
      <div className="flex gap-3"><button type="submit" disabled={uploading} className="btn-gold disabled:opacity-50">Salvar produto</button><button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 text-sm text-muted-foreground hover:text-primary">Cancelar</button></div>
    </form>}
    {loading ? <p className="mt-8 text-muted-foreground">Carregando...</p> : products.length === 0 ? <p className="mt-8 text-muted-foreground">Nenhum produto cadastrado ainda.</p> : <div className="mt-8 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-widest text-muted-foreground"><th className="py-2 pr-4">Produto</th><th className="py-2 pr-4">Categoria</th><th className="py-2 pr-4">Preço</th><th className="py-2 pr-4">Estoque</th><th className="py-2 pr-4">Status</th><th className="py-2"></th></tr></thead><tbody className="divide-y">{products.map((p) => <tr key={p.id}><td className="py-3 pr-4 text-foreground"><div className="flex items-center gap-3">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-12 w-10 object-cover" />}<span>{p.name}</span></div></td><td className="py-3 pr-4 text-muted-foreground">{categoryLabel(p.category_id)}</td><td className="py-3 pr-4">{brl(Number(p.sale_price ?? p.price))}</td><td className={`py-3 pr-4 ${p.stock <= 5 ? "text-destructive font-semibold" : ""}`}>{p.stock}{p.stock <= 5 ? " · Baixo" : ""}</td><td className="py-3 pr-4 text-muted-foreground">{p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}</td><td className="py-3 text-right whitespace-nowrap"><button onClick={() => startEdit(p)} className="mr-3 text-muted-foreground hover:text-primary">Editar</button><button onClick={() => remove(p.id, p.name)} className="text-muted-foreground hover:text-destructive">Remover</button></td></tr>)}</tbody></table></div>}
  </div>;
}
