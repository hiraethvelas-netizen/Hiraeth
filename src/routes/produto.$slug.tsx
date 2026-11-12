import { buildFragrancePyramid, type EssenceNotes } from "@/lib/fragrance";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { galleryImageIndex, uniqueProductPhotos } from "@/lib/product-gallery";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { RelatedProducts } from "@/components/RelatedProducts";
import { brl } from "@/lib/format";
import { visiblePrice } from "@/lib/store-pricing";
import { useStorePromotions } from "@/lib/use-store-promotions";
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
  const { promotions: automaticPromotions, categories: promotionCategories } = useStorePromotions();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
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
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
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
  // A variation selects a photo already in the product gallery, never an extra slide.
  const currentImages = uniqueProductPhotos(product.images);
  function showGalleryImage(index: number) {
    const safeIndex = Math.min(Math.max(0, index), Math.max(0, currentImages.length - 1));
    setActiveImage(safeIndex);
    const gallery = galleryRef.current;
    if (gallery && typeof gallery.scrollTo === "function") gallery.scrollTo({ left: safeIndex * gallery.clientWidth, behavior: "smooth" });
  }
  function showVariationImage(image?: string | null) {
    showGalleryImage(galleryImageIndex(currentImages, image));
  }
  function onGalleryScroll() {
    const gallery = galleryRef.current;
    if (!gallery || gallery.clientWidth <= 0) return;
    const index = Math.round(gallery.scrollLeft / gallery.clientWidth);
    setActiveImage(Math.min(Math.max(0, index), Math.max(0, currentImages.length - 1)));
  }
  const basePrice = hasCombinedVariants
    ? chosenCombination?.price ?? Math.min(...combinationVariants.map(v => v.price))
    : activeVariant?.price != null ? Number(activeVariant.price) : Number(product.price);
  const baseSale = hasCombinedVariants
    ? chosenCombination?.sale_price ?? null
    : activeVariant ? (activeVariant.sale_price != null ? Number(activeVariant.sale_price) : null)
      : (product.sale_price != null ? Number(product.sale_price) : null);
  // The cart keeps its undiscounted-by-automatic-promotions unit price.
  // Automatic benefits are applied only once in the cart's order totals.
  const price = baseSale ?? basePrice;
  const pricePreview = visiblePrice({
    id: product.id, category_id: product.category_id,
    price: basePrice, sale_price: baseSale,
  }, automaticPromotions, promotionCategories);
  const availableStock = hasCombinedVariants
    ? chosenCombination?.stock ?? 0
    : activeVariant?.stock != null ? Number(activeVariant.stock) : Number(product.stock);
  const requiresChoice = hasCombinedVariants && (!selectionComplete || !chosenCombination);
  // Cart quantity is only a per-customer limit, not a reservation of stock.
  // "Estoque esgotado" refers strictly to stock persisted for the product/variation.
  const outOfStock = !requiresChoice && availableStock <= 0;
  const sizeVariantKey = activeVariant ? String(activeVariant.key ?? activeVariant.id ?? activeVariant.label ?? "") : "";
  const houseVariantKey = houseVariants.length > 0 ? String(chosenHouse?.key ?? chosenHouse?.id ?? selectedHouse) : "";
  const variantKey = hasCombinedVariants
    ? chosenCombination?.key
    : [sizeVariantKey, houseVariantKey].filter(Boolean).join("::") || undefined;
  const alreadyInCart = cart.items.find(item =>
    item.productId === product.id && (item.variantKey ?? "") === (variantKey ?? ""))?.quantity ?? 0;
  const remainingToAdd = Math.max(0, availableStock - alreadyInCart);
  const cartQuantityLimitReached = !requiresChoice && !outOfStock && remainingToAdd === 0;
  const variantDetails: Record<string, unknown> = hasCombinedVariants
    ? { options: { ...selectedOptions }, stock: availableStock, variantKey: chosenCombination?.key, originalPrice: basePrice }
    : {
        ...(typeof activeVariant?.label === "string" ? { size: activeVariant.label } : {}),
        ...(houseVariants.length > 0 ? { house: selectedHouse } : {}),
        stock: availableStock,
        originalPrice: basePrice,
      };
  const pyramid = buildFragrancePyramid(aromaNotes);
  const cartImage = currentImages[galleryImageIndex(currentImages, variantImage)] ?? currentImages[0];

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
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <nav className="text-sm text-muted-foreground">
          <Link to="/loja" className="hover:text-primary">Loja</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-4 grid gap-7 sm:mt-6 md:grid-cols-2 md:gap-10">
          <div className="min-w-0">
            {(product as Product & { product_badge?: string | null }).product_badge === "limited" &&
              <div className="mb-3 flex justify-start">
                <span className="hiraeth-product-badge--limited inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-widest">
                  Edição limitada
                </span>
              </div>}
            <div className="relative">
              <div
                ref={galleryRef}
                onScroll={onGalleryScroll}
                role="region"
                aria-label="Galeria de fotos do produto. Deslize para os lados para ver mais imagens."
                className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain border bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {currentImages.length ? currentImages.map((img, index) => (
                  <div key={img} className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center">
                    <img src={img} alt={`${product.name}, foto ${index + 1} de ${currentImages.length}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      draggable={false} className="h-full w-full select-none object-contain" />
                  </div>
                )) : (
                  <div className="flex h-full w-full shrink-0 items-center justify-center font-display text-lg italic text-muted-foreground">
                    Foto em breve
                  </div>
                )}
              </div>
              {currentImages.length > 1 && (
                <>
                  <button type="button" onClick={() => showGalleryImage(activeImage - 1)} disabled={activeImage === 0}
                    aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 px-3 py-2 text-foreground shadow disabled:opacity-30">‹</button>
                  <button type="button" onClick={() => showGalleryImage(activeImage + 1)} disabled={activeImage >= currentImages.length - 1}
                    aria-label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 px-3 py-2 text-foreground shadow disabled:opacity-30">›</button>
                </>
              )}
            </div>
            {currentImages.length > 1 && (
              <>
                <p className="mt-2 text-center text-xs text-muted-foreground">Deslize para ver as fotos · {activeImage + 1} de {currentImages.length}</p>
                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2">
                  {currentImages.map((img, i) => (
                    <button key={img} type="button" onClick={() => showGalleryImage(i)}
                      aria-label={`Ver foto ${i + 1} de ${currentImages.length}`}
                      aria-current={i === activeImage ? "true" : undefined}
                      className={`h-20 w-20 shrink-0 overflow-hidden border ${i === activeImage ? "border-primary" : "opacity-60 hover:opacity-100"}`}>
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </>
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
                      onClick={() => {
                        const nextOptions = { ...selectedOptions, [group.name]: option };
                        setSelectedOptions(nextOptions);
                        const matching = combinationVariants.find(row => variantGroups.every(g => row.options[g.name] === nextOptions[g.name]));
                        // Partial selections can still jump to a shared variation photo.
                        const partial = combinationVariants.find(row => Object.entries(nextOptions)
                          .every(([key, value]) => row.options[key] === value) && currentImages.includes(row.image));
                        showVariationImage(matching?.image ?? partial?.image);
                        setQuantity(1);
                      }}
                      className={`rounded border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                      {option}
                    </button>;
                  })}
                </div>
              </fieldset>
            ))}
            {requiresChoice && <p className="mt-3 text-sm text-muted-foreground">Selecione {variantGroups.map(g => g.name.toLocaleLowerCase("pt-BR")).join(" e ")} para consultar o preço e o estoque.</p>}
            {sizeVariants.length > 0 && <div className="mt-6"><label className="mb-2 block text-sm text-foreground">Tamanho</label><div className="flex flex-wrap gap-2">{sizeVariants.map((v:any) => <button key={v.id ?? v.label} type="button" onClick={() => { setSelectedVariant(v); showVariationImage(v.image); }} className={`border px-4 py-2 text-sm ${activeVariant === v ? "border-primary bg-primary/10" : "border-border"}`}>{v.label}</button>)}</div></div>}
            {houseVariants.length > 0 && <div className="mt-5"><label className="mb-2 block text-sm text-foreground">Escolha sua casa</label><select value={selectedHouse} onChange={(e) => {
                      setSelectedHouse(e.target.value);
                      const house = houseVariants.find(v => v.label === e.target.value);
                      showVariationImage(house?.image || activeVariant?.image);
                    }} className="w-full border bg-background px-3 py-2 text-foreground"><option>Aleatória / casa surpresa</option>{houseVariants.map((v:any) => <option key={v.id ?? v.label} value={v.label}>{v.label}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">A casa será revelada ao acender a vela.</p></div>}

            <div className="mt-4 flex items-baseline gap-3">
              {pricePreview.hasDiscount && !requiresChoice && (
                <span className="text-lg text-muted-foreground line-through" aria-label="Preço original">{brl(pricePreview.original)}</span>
              )}
              <span className="text-3xl text-primary">{hasCombinedVariants && requiresChoice
                ? `A partir de ${brl(Math.min(...combinationVariants.map(row => visiblePrice({
                    id: product.id, category_id: product.category_id,
                    price: row.price, sale_price: row.sale_price,
                  }, automaticPromotions, promotionCategories).current)))}`
                : brl(pricePreview.current)}</span>
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
                <button onClick={() => setQuantity(Math.min(quantity + 1, Math.max(1, remainingToAdd)))} className="px-3 py-2 text-lg">+</button>
              </div>
              <button
                disabled={outOfStock || requiresChoice || cartQuantityLimitReached || quantity > remainingToAdd}
                onClick={() => {
                  if (requiresChoice || !variantKey && hasCombinedVariants) { toast.error("Escolha as variações do produto."); return; }
                  if (quantity > remainingToAdd) { toast.error("Você já colocou as unidades disponíveis desta vela na sacola."); return; }
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
                {requiresChoice ? "Escolha as variações" : outOfStock ? "Estoque esgotado" : cartQuantityLimitReached ? "Limite na sacola" : "Adicionar ao carrinho"}
              </button>
            </div>

            {cartQuantityLimitReached && <p role="status" className="mt-3 text-sm text-primary">
              Você já colocou todas as unidades disponíveis desta opção na sua sacola. Isso não reserva o produto para outros clientes.
            </p>}

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
              {requiresChoice
                ? "Escolha as variações para consultar a disponibilidade."
                : outOfStock
                  ? "Estoque esgotado."
                  : availableStock <= 5
                    ? `Últimas ${availableStock} unidades disponíveis.`
                    : "Em estoque."}
            </p>
          </div>
        </div>
        <RelatedProducts product={product} />
      </main>
      <SiteFooter />
    </div>
  );
}
