import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories"> & { parent_id?: string | null };

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin Hiraeth" }] }),
  component: AdminProdutos,
});

const emptyForm = {
  name: "", description: "", category_id: "", price: "", sale_price: "",
  stock: "0", sku: "", fragrance: "", images: [] as string[], status: "draft",
  weight_grams: "", dimensions: "",
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

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods, error: productsError }, { data: cats, error: categoriesError }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("position"),
    ]);
    if (productsError || categoriesError) {
      setLoadError("Não foi possível carregar produtos e categorias. Verifique a conexão e suas permissões.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setProducts(prods ?? []);
    setCategories((cats ?? []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", category_id: p.category_id ?? "",
      price: String(p.price), sale_price: p.sale_price != null ? String(p.sale_price) : "",
      stock: String(p.stock), sku: p.sku ?? "", fragrance: p.fragrance ?? "",
      images: p.images ?? [], status: p.status, weight_grams: p.weight_grams != null ? String(p.weight_grams) : "",
      dimensions: p.dimensions ?? "",
    });
    setShowForm(true);
  }

  function startNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }

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
      weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
      dimensions: form.dimensions || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) toast.error(error.message.includes("unique") ? "Já existe um produto com esse nome/link." : `Erro ao salvar: ${error.message}`);
    else { toast.success(editing ? "Produto atualizado." : "Produto criado."); setShowForm(false); load(); }
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
        <label className="text-sm text-muted-foreground">Peso (gramas)<input type="number" min="0" step="1" placeholder="Ex.: 250" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Conteúdo / tamanho<input placeholder="Ex.: 250 g, 100 ml, tamanho P" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">SKU<input placeholder="Código interno (opcional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Fragrância<input placeholder="Quando aplicável" value={form.fragrance} onChange={(e) => setForm({ ...form, fragrance: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-sm text-muted-foreground">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
      </div>
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
