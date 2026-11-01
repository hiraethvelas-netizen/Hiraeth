import { buildFragrancePyramid, type EssenceNotes } from "@/lib/fragrance";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { requireAuthenticatedUser } from "@/lib/require-auth";
import { managedVariants, variantList } from "@/lib/product-variants";

type Product = Tables<"products">;
type AromaNote = { essence_id: string; quantity_ml: number; essences?: { name: string; top_notes: string[] | null; heart_notes: string[] | null; base_notes: string[] | null } | null };

export const Route = createFileRoute("/produto/$slug")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({
    meta: [
      { title: "Produto — Hiraeth" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [aromaNotes, setAromaNotes] = useState<EssenceNotes[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedHouse, setSelectedHouse] = useState("Aleatória / casa surpresa");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!active) return;
      setProduct(data);
      setSelectedOptions({});
      setSelectedVariant(null);
      setSelectedHouse("Aleatória / casa surpresa");
      setQuantity(1);
      setActiveImage(0);
      setAromaNotes([]);
      setLoading(false);
      if (data) {
        const { data: notes, error: notesError } = await supabase.rpc("get_product_aroma_notes" as never, { p_product_id: data.id } as never);
        if (active && !notesError && Array.isArray(notes)) setAromaNotes(notes as unknown as EssenceNotes[]);
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && data) {
        setUserId(userData.user.id);
        const { data: w } = await supabase
          .from("wishlist_items")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("product_id", data.id)
          .maybeSingle();
        setInWishlist(!!w);
      }
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
          <p className="text-muted-foreground">Carregando...</p>
        </main>
      </div>
    );
  }

  if (!product) throw notFound();

  const variants: any[] = variantList(product.variants);
  const combinationVariants = managedVariants(variants);
  const hasCombinedVariants = combinationVariants.length > 0 && combinationVariants.length === variants.length;
  const variantGroups = hasCombinedVariants
    ? Object.keys(combinationVariants[0]!.options).map(name => ({
        name, values: [...new Set(combinationVariants.map(row => row.options[name]).filter((option): option is string => Boolean(option)))],
      }))
    : [];
  const selectionComplete = variantGroups.every(group => Boolean(selectedOptions[group.name]));
  const chosenCombination = hasCombinedVariants && selectionComplete
    ? combinationVariants.find(row => variantGroups.every(group => row.options[group.name] === selectedOptions[group.name])) ?? null
    : null;

  // Preserve old products with their former size/house choices until edited by the merchant.
  const sizeVariants = hasCombinedVariants ? [] : variants.filter((v) => v?.type !== "house");
  const houseVariants = hasCombinedVariants ? [] : variants.filter((v) => v?.type === "house");
  const activeVariant = selectedVariant ?? sizeVariants[0] ?? null;
  const chosenHouse = houseVariants.find((v) => v.label === selectedHouse);
  const variantImage: string | undefined = hasCombinedVariants
    ? chosenCombination?.image || undefined
    : chosenHouse?.image || activeVariant?.image || undefined;
  const currentImages: string[] = variantImage ? [variantImage, ...product.images.filter((i) => i !== variantImage)] : product.images;
  const basePrice = hasCombinedVariants
    ? chosenCombination?.price ?? Math.min(...combinationVariants.map(v => v.price))
    : activeVariant?.price != null ? Number(activeVariant.price) : Number(product.price);
  const baseSale = hasCombinedVariants
    ? chosenCombination?.sale_price ?? null
    : activeVariant ? (activeVariant.sale_price != null ? Number(activeVariant.sale_price) : null)
      : (product.sale_price != null ? Number(product.sale_price) : null);
  const price = baseSale ?? basePrice;
  const availableStock = hasCombinedVariants
    ? chosenCombination?.stock ?? 0
    : activeVariant?.stock != null ? Number(activeVariant.stock) : Number(product.stock);
  const requiresChoice = hasCombinedVariants && (!selectionComplete || !chosenCombination);
  const outOfStock = !requiresChoice && availableStock <= 0;
  const sizeVariantKey = activeVariant ? String(activeVariant.key ?? activeVariant.id ?? activeVariant.label ?? "") : "";
  const houseVariantKey = houseVariants.length > 0 ? String(chosenHouse?.key ?? chosenHouse?.id ?? selectedHouse) : "";
  const variantKey = hasCombinedVariants
    ? chosenCombination?.key
    : [sizeVariantKey, houseVariantKey].filter(Boolean).join("::") || undefined;
  const variantDetails: Record<string, unknown> = hasCombinedVariants
    ? { options: { ...selectedOptions }, stock: availableStock, variantKey: chosenCombination?.key }
    : {
        ...(typeof activeVariant?.label === "string" ? { size: activeVariant.label } : {}),
        ...(houseVariants.length > 0 ? { house: selectedHouse } : {}),
        stock: availableStock,
      };
  const pyramid = buildFragrancePyramid(aromaNotes);
  const cartImage = currentImages[0] ?? product.images[0];

  async function toggleWishlist() {
    if (!userId) {
      toast.info("Entre na sua conta para salvar desejos.");
      return;
    }
    if (savingWishlist) return;
    setSavingWishlist(true);
    try {
      const { error } = inWishlist
        ? await supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", product!.id)
        : await supabase
            .from("wishlist_items")
            .insert({ user_id: userId, product_id: product!.id });
      if (error) throw error;
      setInWishlist(!inWishlist);
      toast.success(inWishlist ? "Removido dos desejos." : "Adicionado aos seus desejos.");
    } catch {
      toast.error("Não foi possível atualizar seus desejos. Tente novamente.");
    } finally {
      setSavingWishlist(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
        <nav className="text-sm text-muted-foreground">
          <Link to="/loja" className="hover:text-primary">Loja</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden border bg-muted">
              {currentImages[activeImage] ? (
                <img src={currentImages[activeImage]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-lg italic text-muted-foreground">
                  Foto em breve
                </div>
              )}
            </div>
            {currentImages.length > 1 && (
              <div className="mt-3 flex gap-2">
                {currentImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 overflow-hidden border ${i === activeImage ? "border-primary" : "opacity-60 hover:opacity-100"}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-4xl text-foreground">{product.name}</h1>
            {product.fragrance && <p className="eyebrow mt-2 text-lg">{product.fragrance}</p>}

            {hasCombinedVariants && variantGroups.map(group => (
              <fieldset key={group.name} className="mt-6">
                <legend className="mb-2 text-sm font-medium text-foreground">{group.name}</legend>
                <div className="flex flex-wrap gap-2">
                  {group.values.map(option => {
                    const selected = selectedOptions[group.name] === option;
                    const possible = combinationVariants.some(row => row.options[group.name] === option &&
                      variantGroups.every(other => other.name === group.name ||
                        !selectedOptions[other.name] || row.options[other.name] === selectedOptions[other.name]));
                    return <button key={option} type="button" disabled={!possible}
                      aria-pressed={selected}
                      onClick={() => { setSelectedOptions(previous => ({ ...previous, [group.name]: option })); setActiveImage(0); setQuantity(1); }}
                      className={`rounded border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                      {option}
                    </button>;
                  })}
                </div>
              </fieldset>
            ))}
            {requiresChoice && <p className="mt-3 text-sm text-muted-foreground">Selecione {variantGroups.map(g => g.name.toLocaleLowerCase("pt-BR")).join(" e ")} para consultar o preço e o estoque.</p>}
            {sizeVariants.length > 0 && <div className="mt-6"><label className="mb-2 block text-sm text-foreground">Tamanho</label><div className="flex flex-wrap gap-2">{sizeVariants.map((v:any) => <button key={v.id ?? v.label} type="button" onClick={() => { setSelectedVariant(v); setActiveImage(0); }} className={`border px-4 py-2 text-sm ${activeVariant === v ? "border-primary bg-primary/10" : "border-border"}`}>{v.label}</button>)}</div></div>}
            {houseVariants.length > 0 && <div className="mt-5"><label className="mb-2 block text-sm text-foreground">Escolha sua casa</label><select value={selectedHouse} onChange={(e) => { setSelectedHouse(e.target.value); setActiveImage(0); }} className="w-full border bg-background px-3 py-2 text-foreground"><option>Aleatória / casa surpresa</option>{houseVariants.map((v:any) => <option key={v.id ?? v.label} value={v.label}>{v.label}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">A casa será revelada ao acender a vela.</p></div>}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl text-primary">{hasCombinedVariants && requiresChoice ? `A partir de ${brl(Math.min(...combinationVariants.map(row => row.sale_price ?? row.price)))}` : brl(price)}</span>
              {baseSale != null && (
                <span className="text-lg text-muted-foreground line-through">{brl(basePrice)}</span>
              )}
            </div>

            {aromaNotes.length > 0 && <section className="mt-6 border-l-2 border-primary pl-4"><h2 className="font-display text-xl text-foreground">Pirâmide olfativa</h2>{([["Saída", "top"], ["Corpo", "heart"], ["Fundo", "base"]] as const).map(([label, key])=>{const notes=pyramid[key];return notes.length ? <div key={label} className="mt-3"><p className="text-xs uppercase tracking-widest text-primary">{label}</p><p className="mt-1 text-sm text-foreground/85">{notes.join(", ")}</p></div> : null;})}</section>}

            {product.description && (
              <p className="mt-6 leading-relaxed text-foreground/85">{product.description}</p>
            )}

            {product.features && product.features.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-6 text-foreground/85 marker:text-primary">
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg">−</button>
                <span className="w-10 text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(quantity + 1, requiresChoice ? 1 : Math.max(1, availableStock)))} className="px-3 py-2 text-lg">+</button>
              </div>
              <button
                disabled={outOfStock || requiresChoice || quantity > availableStock}
                onClick={() => {
                  if (requiresChoice || !variantKey && hasCombinedVariants) { toast.error("Escolha as variações do produto."); return; }
                  const alreadyInCart = cart.items.find(item => item.productId === product.id && (item.variantKey ?? "") === (variantKey ?? ""))?.quantity ?? 0;
                  if (quantity + alreadyInCart > availableStock) { toast.error("Estoque insuficiente para essa opção. Confira a quantidade no carrinho."); return; }
                  cart.add(
                    {
                      productId: product.id,
                      categoryId: product.category_id,
                      ...(variantKey ? { variantKey } : {}),
                      variantDetails,
                      slug: product.slug,
                      name: product.name,
                      price,
                      ...(cartImage ? { image: cartImage } : {}),
                    },
                    quantity,
                  );
                  toast.success("Adicionado ao carrinho.");
                }}
                className="btn-gold flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                {requiresChoice ? "Escolha as variações" : outOfStock ? "Esgotado" : "Adicionar ao carrinho"}
              </button>
            </div>

            <button
              onClick={toggleWishlist}
              disabled={savingWishlist}
              aria-busy={savingWishlist}
              className="mt-4 text-sm text-muted-foreground underline hover:text-primary"
            >
              {inWishlist ? "♥ Nos seus desejos" : "♡ Adicionar aos desejos"}
            </button>

            {product.portal_id && (
              <p className="mt-6 border-l-2 border-primary pl-4 text-sm italic text-muted-foreground">
                Esta peça possui um portal NFC. Escaneie a tag da embalagem para abrir o universo.
              </p>
            )}

            <p className="mt-6 text-sm text-muted-foreground">
              {availableStock > 0 && availableStock <= 5
                ? `Últimas ${availableStock} unidades.`
                : outOfStock
                  ? "Indisponível no momento."
                  : "Em estoque."}
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
