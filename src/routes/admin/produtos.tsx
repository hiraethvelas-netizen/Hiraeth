import { type StockEssence, type CandleIngredient } from "@/components/admin/CandleEssenceEditor";
import { essenceNotesPayload, type NotesDraft } from "@/lib/fragrance";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { CandleRecipesEditor } from "@/components/admin/CandleRecipesEditor";
import { recipePayload, withRecipeIds, type StockUnit, type VariantRecipes } from "@/lib/candle-recipes";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import { PRODUCT_BADGE_OPTIONS } from "@/lib/product-badges";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import type { CropAspect } from "@/lib/image-crop";
import { validateVariantSetup, variantSetupFrom, variantTotalStock, type VariantSetup } from "@/lib/product-variants";
import { filterAdminProducts } from "@/lib/admin-product-search";

type Product = Tables<"products">;
type Category = Tables<"categories"> & { parent_id?: string | null };
type Essence = StockEssence & { notes?: string | null; top_notes?: string[]; heart_notes?: string[]; base_notes?: string[] };

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin Hiraeth" }] }),
  component: AdminProdutos,
});

const emptyForm = {
  name: "", description: "", category_id: "", price: "", sale_price: "",
  stock: "0", sku: "", fragrance: "", weight_grams: "", images: [] as string[], status: "draft",
  product_type: "candle", product_badge: "",
};

export function AdminProdutos({ mode = "list", productId }: { mode?: "list" | "new" | "edit"; productId?: string } = {}) {
  const navigate = useNavigate();
  const initialized = useRef<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariantsState] = useState<VariantSetup>(() => variantSetupFrom([]));
  const setVariants = useCallback((next: SetStateAction<VariantSetup>) => {
    setVariantsState(previous => withRecipeIds(typeof next === "function" ? next(previous) : next));
  }, []);
  const [variantRecipes, setVariantRecipes] = useState<VariantRecipes>({});
  const [showForm, setShowForm] = useState(mode === "new");
  const [uploading, setUploading] = useState(false);
  const [photoCrop, setPhotoCrop] = useState<{
    source: File | string; pending: File[]; replaceIndex?: number;
  } | null>(null);
  const [photoAspect, setPhotoAspect] = useState<CropAspect>("portrait");
  const db = supabase as any;
  const [essences, setEssences] = useState<Essence[]>([]);
  const [saving, setSaving] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [refreshingEssences, setRefreshingEssences] = useState(false);
  const [productAromas, setProductAromas] = useState<CandleIngredient[]>([]);

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
    if (aromaError) {
      setStockError("Não foi possível carregar as essências: " + aromaError.message);
      toast.error("Não foi possível carregar as essências do estoque.");
    } else {
      setEssences((aromaData ?? []) as Essence[]);
      setStockError(null);
    }
    setLoading(false);
  }, []);

  async function refreshEssences() {
    setRefreshingEssences(true);
    try {
      const { data, error } = await db.from("essences").select("*").eq("active", true).order("name");
      if (error) throw error;
      setEssences((data ?? []) as Essence[]);
      setStockError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar essências.";
      setStockError("Não foi possível atualizar o estoque: " + message);
      toast.error("Erro ao consultar estoque: " + message);
    } finally {
      setRefreshingEssences(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  async function startEdit(p: Product) {
    setPhotoCrop(null);
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", category_id: p.category_id ?? "",
      price: String(p.price), sale_price: p.sale_price != null ? String(p.sale_price) : "",
      stock: String(p.stock), sku: p.sku ?? "", fragrance: p.fragrance ?? "",
      weight_grams: p.weight_grams == null ? "" : String(p.weight_grams),
      images: p.images ?? [], status: p.status,
      product_type: (p as Product & { product_type?: string }).product_type ?? (/camiseta|t-shirt|roupa|vestuário/i.test(p.name) ? "artifact" : "candle"), product_badge: (p as any).product_badge ?? "",
    });
    const [standard, specific] = await Promise.all([
      db.from("product_essences").select("essence_id,quantity_ml,essences(name,stock_unit)").eq("product_id", p.id),
      db.from("product_variant_essences").select("recipe_id,essence_id,quantity,essences(name,stock_unit)").eq("product_id", p.id),
    ]);
    if (standard.error || specific.error) {
      setLoadError("Não foi possível carregar as receitas desta vela. Confira as permissões e tente novamente.");
      toast.error("Não foi possível carregar as receitas. Confira a atualização do banco e tente novamente antes de editar.");
      return;
    }
    setVariants(variantSetupFrom(p.variants));
    setProductAromas((standard.data ?? []).map((r:any) => ({essence_id:r.essence_id,quantity_ml:Number(r.quantity_ml),name:r.essences?.name ?? "Aroma",stock_unit:r.essences?.stock_unit ?? "ml"})));
    const recipes: VariantRecipes = {};
    for (const row of specific.data ?? []) {
      (recipes[row.recipe_id] ??= []).push({ essence_id: row.essence_id, quantity_ml: Number(row.quantity), name: row.essences?.name ?? "Aroma", stock_unit: row.essences?.stock_unit ?? "ml" });
    }
    setVariantRecipes(recipes);
    setShowForm(true);
  }

  useEffect(() => {
    if (mode !== "edit" || loading || loadError || !productId || initialized.current === productId) return;
    const selected = products.find(product => product.id === productId);
    if (!selected) {
      setLoadError("Este produto não foi encontrado. Volte à lista e selecione uma vela publicada.");
      return;
    }
    initialized.current = productId;
    void startEdit(selected);
  }, [mode, productId, loading, loadError, products]);


  async function chooseProductPhotos(files: FileList | null) {
    if (!files?.length || uploading) return;
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast.error("Escolha imagens JPG, PNG, WebP ou GIF.");
      } else if (file.size > 10 * 1024 * 1024) {
        toast.error("Cada imagem deve ter no máximo 10 MB.");
      } else {
        accepted.push(file);
      }
    }
    if (!accepted.length) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of accepted) {
        try {
          uploaded.push(await uploadProductPhoto(file));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Falha ao enviar uma foto.");
        }
      }
      if (uploaded.length) {
        setForm(previous => ({ ...previous, images: [...previous.images, ...uploaded] }));
        toast.success(uploaded.length === 1 ? "Foto adicionada. Use Editar foto para recortar, se desejar." : `${uploaded.length} fotos adicionadas. Você pode recortá-las pelo botão Editar foto.`);
      }
    } finally {
      setUploading(false);
    }
  }

  async function uploadProductPhoto(file: File): Promise<string> {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      throw new Error("Formato de imagem não permitido.");
    }
    if (file.size > 10 * 1024 * 1024) throw new Error("Cada imagem deve ter até 10 MB.");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (error) throw new Error("Falha ao enviar imagem: " + error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    if (!data.publicUrl) throw new Error("Não foi possível gerar o endereço da imagem.");
    return data.publicUrl;
  }

  async function applyProductPhotoCrop(file: File) {
    if (!photoCrop) return;
    const current = photoCrop;
    setUploading(true);
    try {
      const url = await uploadProductPhoto(file);
      setForm(previous => {
        if (current.replaceIndex !== undefined) {
          const images = [...previous.images];
          if (current.replaceIndex >= images.length) return previous;
          images[current.replaceIndex] = url;
          return { ...previous, images };
        }
        return { ...previous, images: [...previous.images, url] };
      });
      if (current.replaceIndex !== undefined && typeof current.source === "string") {
        const originalUrl = current.source;
        setVariants(previous => ({
          ...previous,
          rows: previous.rows.map(row => row.image === originalUrl ? { ...row, image: url } : row),
          legacy: previous.legacy?.map(row => row.image === originalUrl ? { ...row, image: url } : row) ?? null,
        }));
      }
      if (current.pending.length > 0) {
        setPhotoCrop({ source: current.pending[0]!, pending: current.pending.slice(1) });
      } else {
        setPhotoCrop(null);
      }
    } finally {
      setUploading(false);
    }
  }

  function skipProductPhotoCrop() {
    setPhotoCrop(current => current?.pending.length
      ? { source: current.pending[0]!, pending: current.pending.slice(1) }
      : null);
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
    // Every variation photo belongs to the product gallery. No extra image
    // is inserted into the customer gallery when an option is selected.
    setForm(current => ({
      ...current,
      images: current.images.includes(data.publicUrl)
        ? current.images : [...current.images, data.publicUrl],
    }));
    return data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (photoCrop || uploading) { toast.error("Finalize ou cancele o recorte das fotos antes de salvar."); return; }
    const variantError = validateVariantSetup(variants);
    if (variantError) { toast.error(variantError); return; }
    const variantRows = variants.legacy ?? variants.rows;
    const productWeight = form.weight_grams.trim() === "" ? null : Number(form.weight_grams);
    if (productWeight !== null && (!Number.isFinite(productWeight) || productWeight <= 0 || productWeight > 30000)) {
      toast.error("Informe um peso válido de até 30.000 g para o produto."); return;
    }
    if (variantRows.some(row => row.weight_grams != null && (!Number.isFinite(Number(row.weight_grams)) || Number(row.weight_grams) <= 0 || Number(row.weight_grams) > 30000))) {
      toast.error("Confira o peso de envio das variações."); return;
    }
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
      weight_grams: productWeight,
      dimensions: editing?.dimensions ?? null, variants: variantRows, product_badge: form.product_badge || null,
    };
    if (saving) return;
    setSaving(true);
    try {
      const result = form.product_type === "candle"
        ? await db.rpc("save_product_with_recipes", {
          p_product_id: editing?.id ?? null,
          p_product: payload,
          ...recipePayload(productAromas, variantRecipes, variants),
        })
        : editing
          ? await db.from("products").update(payload).eq("id", editing.id).select("id").single()
          : await db.from("products").insert(payload).select("id").single();
      if (result.error || !result.data) {
        throw new Error("Produto e receitas não foram salvos. Confira a atualização do banco e tente novamente.");
      }
      toast.success(editing ? "Produto atualizado." : "Produto criado.");
      if (mode !== "list") {
        await navigate({ to: "/admin/produtos" });
      } else {
        setShowForm(false);
        await load();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto. Confira a atualização do banco e suas permissões.");
    } finally { setSaving(false); }
  }


  async function createAroma(input: { name: string; stock_ml: number; stock_unit?: StockUnit; notes: NotesDraft }): Promise<StockEssence> {
    const payload = {
      name: input.name.trim(),
      stock_ml: input.stock_ml,
      stock_unit: input.stock_unit ?? "ml",
      minimum_stock_ml: 10,
      target_stock_ml: 50,
      ...essenceNotesPayload(input.name, input.notes),
      active: true,
    };
    try {
      const { data, error } = await db.from("essences").insert(payload).select("*").single();
      if (error || !data) throw error ?? new Error("O banco não confirmou a nova essência.");
      const essence = data as Essence;
      setEssences(current => [...current.filter(row => row.id !== essence.id), essence]
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setStockError(null);
      return essence;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      if (/unique|duplicate|23505/i.test(message)) {
        throw new Error("Essa essência já está cadastrada. Pesquise pelo nome na aba Estoque.");
      }
      throw new Error("Não foi possível cadastrar a essência: " + message);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remover "${name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o produto."); return; }
    toast.success("Produto removido."); load();
  }

  const inputCls = "min-h-11 w-full rounded-xl border border-[#8a9066] bg-[#fbf7eb] px-3 py-2 text-[#34402b] placeholder:text-[#6a664d] [color-scheme:light] focus:border-[#47532c] focus:outline-none focus:ring-2 focus:ring-[#878e47]/30";
  const parentCategories = categories.filter((c) => !c.parent_id);
  const categoryLabel = (id: string | null) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return "—";
    const parent = cat.parent_id ? categories.find((c) => c.id === cat.parent_id) : null;
    return parent ? `${parent.name} / ${cat.name}` : cat.name;
  };

  const filteredProducts = filterAdminProducts(products, categories, searchTerm, statusFilter);

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
        
        <label className="text-sm text-muted-foreground">Peso de envio do produto (g)
          <input type="number" min="1" step="1" placeholder="Ex.: 180" value={form.weight_grams}
            onChange={(e) => setForm({ ...form, weight_grams: e.target.value })} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="text-sm text-muted-foreground">SKU<input placeholder="Código interno (opcional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
        
        <label className="text-sm text-muted-foreground">Selo do produto<select value={form.product_badge} onChange={(e) => setForm({ ...form, product_badge: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">Sem selo</option>{PRODUCT_BADGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm text-muted-foreground">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
      </div>
      {form.product_type === "candle" && <CandleRecipesEditor
        key={editing?.id ?? "new-product"}
        variants={variants}
        variantRecipes={variantRecipes}
        onVariantRecipesChange={setVariantRecipes}
        essences={essences}
        ingredients={productAromas}
        onIngredientsChange={setProductAromas}
        onCreate={createAroma}
        onRefresh={refreshEssences}
        stockError={stockError}
        refreshing={refreshingEssences}
        saving={saving}
      />}
      <ProductVariantsEditor value={variants} onChange={setVariants} basePrice={Number(form.price) || 0} galleryImages={form.images} onUpload={uploadVariantPhoto} disabled={saving || uploading} />
      <label className="block text-sm text-muted-foreground">Descrição<textarea placeholder="Conte a história, materiais e detalhes do produto..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`mt-1 ${inputCls}`} /></label>
      <div className="space-y-3">
        <div><p className="text-sm text-foreground">Fotos do produto</p><p className="text-xs text-muted-foreground">Escolha fotos e ajuste corte, zoom, posição e rotação antes de enviar. Você pode ajustar novamente as imagens cadastradas. A primeira é a capa.</p></div>
        <label className="inline-flex cursor-pointer items-center border px-4 py-2 text-sm text-foreground hover:border-primary"><span>{uploading ? "Enviando recorte..." : "+ Escolher imagens"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading || !!photoCrop} onChange={(e) => { chooseProductPhotos(e.currentTarget.files); e.currentTarget.value = ""; }} className="sr-only" /></label>
        {form.images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{form.images.map((url, i) => <div key={i + ":" + url} className="relative border p-2"><img src={url} alt={`Foto ${i + 1} de ${form.name || "produto"}`} className="h-32 w-full object-cover" /><p className="mt-1 text-xs text-muted-foreground">{i === 0 ? "Imagem principal" : `Imagem ${i + 1}`}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={i === 0} onClick={() => setForm(prev => ({ ...prev, images: [url, ...prev.images.filter((_, idx) => idx !== i)] }))} className="text-xs text-primary disabled:opacity-30">Tornar capa</button><button type="button" onClick={() => { setPhotoAspect("portrait"); setPhotoCrop({ source: url, pending: [], replaceIndex: i }); }} className="text-xs text-primary">Ajustar foto</button><button type="button" onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))} className="text-xs text-destructive">Remover</button></div></div>)}</div>}
      </div>
      <div className="flex gap-3"><button type="submit" disabled={uploading || saving} className="btn-gold disabled:opacity-50">{saving ? "Salvando..." : "Salvar produto"}</button><button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 text-sm text-muted-foreground hover:text-primary">Cancelar</button></div>
    </form>}
    {photoCrop && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-5"
      role="dialog" aria-modal="true" aria-label="Editar foto do produto">
      <div className="my-auto max-h-[95dvh] w-full max-w-xl overflow-y-auto rounded border border-primary/35 bg-background p-5 shadow-2xl">
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Proporção do recorte">
          {([
            ["portrait", "Vertical 4:5"],
            ["square", "Quadrado 1:1"],
            ["photo", "Horizontal 4:3"],
          ] as const).map(([aspect, title]) => (
            <button key={aspect} type="button" aria-pressed={photoAspect === aspect}
              disabled={uploading} onClick={() => setPhotoAspect(aspect)}
              className={`rounded border px-3 py-2 text-xs ${photoAspect === aspect ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground"}`}>
              {title}
            </button>
          ))}
        </div>
        <ImageCropEditor key={String(photoAspect) + (typeof photoCrop.source === "string" ? photoCrop.source : photoCrop.source.name)}
          source={photoCrop.source} aspect={photoAspect} squarePreview="square"
          onApply={applyProductPhotoCrop} onCancel={skipProductPhotoCrop} />
        {photoCrop.pending.length > 0 && <p className="mt-3 text-xs text-muted-foreground">
          Próximas fotos: {photoCrop.pending.length}. Ao aplicar ou cancelar, você passa para a próxima.
        </p>}
      </div>
    </div>}
    {loading ? <p className="mt-8 text-muted-foreground">Carregando...</p> : products.length === 0 ? <p className="mt-8 text-muted-foreground">Nenhum produto cadastrado ainda.</p> : <div className="mt-8 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-widest text-muted-foreground"><th className="py-2 pr-4">Produto</th><th className="py-2 pr-4">Categoria</th><th className="py-2 pr-4">Preço</th><th className="py-2 pr-4">Estoque</th><th className="py-2 pr-4">Status</th><th className="py-2"></th></tr></thead><tbody className="divide-y">{products.map((p) => <tr key={p.id}><td className="py-3 pr-4 text-foreground"><div className="flex items-center gap-3">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-12 w-10 object-cover" />}<span>{p.name}</span></div></td><td className="py-3 pr-4 text-muted-foreground">{categoryLabel(p.category_id)}</td><td className="py-3 pr-4">{brl(Number(p.sale_price ?? p.price))}</td><td className={`py-3 pr-4 ${p.stock <= 5 ? "text-destructive font-semibold" : ""}`}>{p.stock}{p.stock <= 5 ? " · Baixo" : ""}</td><td className="py-3 pr-4 text-muted-foreground">{p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}</td><td className="py-3 text-right whitespace-nowrap"><button onClick={() => startEdit(p)} className="mr-3 text-muted-foreground hover:text-primary">Editar</button><button onClick={() => remove(p.id, p.name)} className="text-muted-foreground hover:text-destructive">Remover</button></td></tr>)}</tbody></table></div>}
  </div>;
}
