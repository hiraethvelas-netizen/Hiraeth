import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin Hiraeth" }] }),
  component: AdminProdutos,
});

const emptyForm = {
  name: "",
  description: "",
  category_id: "",
  price: "",
  sale_price: "",
  stock: "0",
  sku: "",
  fragrance: "",
  images: "",
  status: "draft",
};

function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("position"),
    ]);
    setProducts(prods ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      category_id: p.category_id ?? "",
      price: String(p.price),
      sale_price: p.sale_price != null ? String(p.sale_price) : "",
      stock: String(p.stock),
      sku: p.sku ?? "",
      fragrance: p.fragrance ?? "",
      images: p.images.join("\n"),
      status: p.status,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      slug: editing ? editing.slug : slugify(form.name),
      description: form.description || null,
      category_id: form.category_id || null,
      price: Number(form.price) || 0,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Number(form.stock) || 0,
      sku: form.sku || null,
      fragrance: form.fragrance || null,
      images: form.images.split("\n").map((s) => s.trim()).filter(Boolean),
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) {
      toast.error(error.message.includes("unique") ? "Já existe um produto com esse nome/link." : "Erro ao salvar.");
    } else {
      toast.success(editing ? "Produto atualizado." : "Produto criado.");
      setShowForm(false);
      load();
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remover "${name}"?`)) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto removido.");
    load();
  }

  const inputCls =
    "w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-foreground">Produtos</h1>
        <button onClick={startNew} className="btn-gold">+ Novo produto</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mt-6 space-y-4 border bg-card p-6">
          <p className="font-display text-xl text-primary">{editing ? `Editar: ${editing.name}` : "Novo produto"}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input required type="number" step="0.01" min="0" placeholder="Preço (R$)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
            <input type="number" step="0.01" min="0" placeholder="Preço promocional (opcional)" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={inputCls} />
            <input type="number" min="0" placeholder="Estoque" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
            <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
            <input placeholder="Fragrância (quando aplicável)" value={form.fragrance} onChange={(e) => setForm({ ...form, fragrance: e.target.value })} className={inputCls} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <textarea placeholder="Descrição" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          <label className="block text-sm text-muted-foreground">
            Imagens — uma URL por linha (a primeira é a principal)
            <textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={`mt-1 ${inputCls}`} />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="btn-gold">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 text-sm text-muted-foreground hover:text-primary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-4">Produto</th>
                <th className="py-2 pr-4">Preço</th>
                <th className="py-2 pr-4">Estoque</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 text-foreground">{p.name}</td>
                  <td className="py-3 pr-4">{brl(Number(p.sale_price ?? p.price))}</td>
                  <td className={`py-3 pr-4 ${p.stock <= 5 ? "text-destructive" : ""}`}>{p.stock}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => startEdit(p)} className="mr-3 text-muted-foreground hover:text-primary">Editar</button>
                    <button onClick={() => remove(p.id, p.name)} className="text-muted-foreground hover:text-destructive">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
