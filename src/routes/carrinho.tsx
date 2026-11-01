import { combineBenefits, promotionBenefit, type Promotion, type PromotionCategory } from "@/lib/promotions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { requireAuthenticatedUser } from "@/lib/require-auth";
import { managedVariants } from "@/lib/product-variants";

export const Route = createFileRoute("/carrinho")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({ meta: [{ title: "Carrinho — Hiraeth" }] }),
  component: Carrinho,
});

function Carrinho() {
  const cart = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    cartKey: string;
    promotion?: Promotion;
  } | null>(null);
  const cartKey = JSON.stringify(cart.items);
  const currentCartKey = useRef(cartKey);
  currentCartKey.current = cartKey;
  const couponIsCurrent = appliedCoupon?.cartKey === cartKey;
  const [automaticPromotions, setAutomaticPromotions] = useState<Promotion[]>([]);
  const [promotionCategories, setPromotionCategories] = useState<PromotionCategory[]>([]);
  const [productCategories, setProductCategories] = useState<{id: string; category_id: string | null}[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [promotionsError, setPromotionsError] = useState(false);
  const [refreshPromotions, setRefreshPromotions] = useState(0);
  const productIds = [...new Set(cart.items.map(item => item.productId))].sort().join(",");
  useEffect(() => {
    let active = true;
    setPromotionsLoading(true);
    async function load() {
      try {
        const [promos, categories, products] = await Promise.all([
          supabase.from("promotions").select("*").eq("active", true).eq("visible", true).neq("kind", "coupon"),
          supabase.from("categories").select("id,parent_id"),
          productIds ? supabase.from("products").select("id,category_id").in("id", productIds.split(",")) : Promise.resolve({ data: [], error: null }),
        ]);
        if (promos.error || categories.error || products.error) throw new Error("Promoções indisponíveis");
        if (!active) return;
        setAutomaticPromotions((promos.data ?? []) as Promotion[]);
        setPromotionCategories(categories.data ?? []);
        setProductCategories(products.data ?? []);
        setPromotionsError(false);
      } catch { if (active) setPromotionsError(true); }
      finally { if (active) setPromotionsLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [productIds, refreshPromotions]);
  const promotionItems = cart.items.map(item => ({ ...item, categoryId: productCategories.find(product => product.id === item.productId)?.category_id ?? item.categoryId ?? null }));
  const couponBenefit = couponIsCurrent && appliedCoupon?.promotion ? promotionBenefit(appliedCoupon.promotion, promotionItems, promotionCategories) : null;
  const automaticBenefits = automaticPromotions.flatMap(promotion => { const benefit = promotionBenefit(promotion, promotionItems, promotionCategories); return benefit ? [benefit] : []; });
  const benefits = combineBenefits([...automaticBenefits, ...(couponBenefit ? [couponBenefit] : [])], cart.total);
  const couponCode = couponBenefit && benefits.applied.some(benefit => benefit.id === couponBenefit.id) ? appliedCoupon!.code : null;
  const totalDiscount = benefits.discount;
  const couponDiscount = couponBenefit ? benefits.applied.find(benefit => benefit.id === couponBenefit.id)?.discount ?? 0 : 0;
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const db = supabase as any;
  const payableTotal = Math.max(0, cart.total - totalDiscount);

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) { toast.error("Digite o código do cupom."); return; }
    if (validatingCoupon) return;
    setValidatingCoupon(true);
    const requestedCartKey = cartKey;
    try {
      const now = new Date().toISOString();
      const { data, error } = await db.from("promotions").select("*").eq("kind", "coupon").eq("code", code).eq("active", true).eq("visible", true).maybeSingle();
      if (currentCartKey.current !== requestedCartKey) {
        toast.error("O carrinho mudou durante a consulta. Aplique o cupom novamente.");
        return;
      }
      if (error || !data || (data.starts_at && data.starts_at > now) || (data.ends_at && data.ends_at < now) || (data.usage_limit != null && data.usage_count >= data.usage_limit) || cart.total < Number(data.min_cart_value ?? 0)) {
        setAppliedCoupon(null);
        toast.error("Cupom inválido, expirado ou não aplicável a este carrinho.");
        return;
      }
      const promotion = { active: true, visible: true, all_products: true, ...data } as Promotion;
      const benefit = promotionBenefit(promotion, promotionItems, promotionCategories);
      if (!benefit) { setAppliedCoupon(null); toast.error("O cupom não se aplica aos produtos selecionados."); return; }
      setAppliedCoupon({ code, discount: benefit.discount, cartKey: requestedCartKey, promotion });
      toast.success("Cupom aplicado.");
    } catch {
      setAppliedCoupon(null);
      toast.error("Não foi possível verificar o cupom. Tente novamente.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function checkout() {
    setPlacing(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setPlacing(false);
      navigate({ to: "/auth", search: { redirect: "/carrinho" } });
      return;
    }

    // Valida estoque antes de criar o pedido
    const ids = cart.items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase.from("products").select("id, name, stock, variants").in("id", ids);
    if (productsError) { toast.error("Não foi possível validar o estoque. Tente novamente."); setPlacing(false); return; }
    for (const item of cart.items) {
      const p = products?.find((x) => x.id === item.productId);
      const currentVariants = managedVariants(p?.variants);
      const selected = item.variantKey ? currentVariants.find(row => row.key === item.variantKey) : null;
      const variantStock = currentVariants.length
        ? (selected?.stock ?? 0)
        : typeof item.variantDetails?.["stock"] === "number" ? item.variantDetails["stock"] : null;
      if (!p || (variantStock !== null ? variantStock < item.quantity : p.stock < item.quantity)) {
        toast.error(`Estoque insuficiente para "${item.name}".`);
        setPlacing(false);
        return;
      }
    }

    const { data: order, error } = await db
      .from("orders")
      .insert({
        user_id: userData.user.id,
        total: payableTotal,
        subtotal: cart.total,
        discount: totalDiscount,
        coupon_code: couponCode,
        ...(benefits.freeShipping ? { shipping: 0 } : {}),
        promotion_summary: { applied: benefits.applied, free_shipping: benefits.freeShipping, gifts: benefits.gifts },
        customer_email: userData.user.email ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !order) {
      toast.error("Não foi possível criar o pedido. Tente novamente.");
      setPlacing(false);
      return;
    }

    const { error: itemError } = await db.from("order_items").insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        variant_details: i.variantDetails ?? {},
      })),
    );
    if (itemError) {
      const cleanup = await db.rpc("discard_incomplete_order", { p_order_id: order.id });
      setRefreshPromotions(value => value + 1);
      toast.error(cleanup.error || cleanup.data !== true ? "Não foi possível salvar os itens. Um registro pendente pode ter ficado no histórico; contate o suporte antes de repetir a compra." : "Não foi possível salvar os itens. Confira as promoções atualizadas e tente novamente.");
      setPlacing(false);
      return;
    }

    cart.clear();
    setPlacing(false);
    toast.success("Pedido registrado! O pagamento será configurado em breve.");
    navigate({ to: "/pedidos" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <p className="eyebrow">Sua seleção</p>
        <h1 className="mt-2 text-5xl text-foreground">Carrinho</h1>

        {cart.items.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="font-display text-2xl italic text-primary">Seu carrinho está vazio</p>
            <Link to="/loja" className="btn-gold mt-8">Explorar a loja</Link>
          </div>
        ) : (
          <>
            <ul className="mt-10 divide-y">
              {cart.items.map((item) => (
                <li key={`${item.productId}-${item.variantKey ?? "default"}`} className="flex items-center gap-4 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden border bg-muted">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <Link to="/produto/$slug" params={{ slug: item.slug }} className="text-xl text-foreground hover:text-primary">
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{brl(item.price)} cada</p>
                    {typeof item.variantDetails?.["size"] === "string" && <p className="text-xs text-muted-foreground">Tamanho: {item.variantDetails["size"]}</p>}
                    {typeof item.variantDetails?.["house"] === "string" && <p className="text-xs text-muted-foreground">Casa: {item.variantDetails["house"]}</p>}
                    {item.variantDetails?.["options"] && typeof item.variantDetails["options"] === "object" && !Array.isArray(item.variantDetails["options"]) &&
                      Object.entries(item.variantDetails["options"] as Record<string, string>).map(([name, value]) =>
                        <p key={name} className="text-xs text-muted-foreground">{name}: {String(value)}</p>)}
                  </div>
                  <div className="flex items-center border">
                    <button disabled={placing} onClick={() => cart.setQuantity(item.productId, item.quantity - 1, item.variantKey)} className="px-3 py-1">−</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button disabled={placing} onClick={() => cart.setQuantity(item.productId, item.quantity + 1, item.variantKey)} className="px-3 py-1">+</button>
                  </div>
                  <span className="w-24 text-right text-primary">{brl(item.price * item.quantity)}</span>
                  <button disabled={placing} onClick={() => cart.remove(item.productId, item.variantKey)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t pt-6 text-right">
              <div className="mb-5 flex gap-2"><input disabled={placing} aria-label="Cupom de desconto" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Código do cupom" className="min-w-0 flex-1 border bg-transparent px-3 py-2 text-sm" /><button type="button" onClick={() => void applyCoupon()} disabled={validatingCoupon || placing} className="border px-4 py-2 text-sm">{validatingCoupon ? "Verificando..." : "Aplicar cupom"}</button></div>
              {appliedCoupon && !couponIsCurrent && <p role="status" className="mb-2 text-sm text-muted-foreground">O carrinho mudou. Aplique o cupom novamente para atualizar o desconto.</p>}
              {couponCode && <p className="mb-2 text-sm text-primary">Cupom {couponCode}: −{brl(couponDiscount)} <button disabled={placing} className="ml-2 underline" onClick={() => {setAppliedCoupon(null);setCoupon("");}}>Remover</button></p>}
              {promotionsLoading && <p role="status" className="mb-2 text-sm text-muted-foreground">Verificando promoções disponíveis...</p>}
              {promotionsError && <p role="alert" className="mb-2 text-sm text-foreground">Não foi possível verificar as promoções. <button type="button" className="underline" onClick={() => setRefreshPromotions(value => value + 1)}>Tentar novamente</button></p>}
              {benefits.applied.filter(benefit => benefit.id !== couponBenefit?.id && benefit.discount > 0).map(benefit => <p key={benefit.id} className="mb-2 text-sm text-primary">{benefit.name}: −{brl(benefit.discount)}</p>)}
              {benefits.freeShipping && <p className="mb-2 text-sm text-primary">Frete grátis aplicado.</p>}
              {benefits.gifts.map(gift => <p key={gift} className="mb-2 text-sm text-primary">Brinde: {gift}</p>)}
              {couponIsCurrent && couponBenefit && !couponCode && <p className="mb-2 text-sm text-muted-foreground">Os descontos já atingiram o valor dos produtos; este cupom não reduz mais o total.</p>}
              <p className="text-sm text-muted-foreground">Subtotal: {brl(cart.total)}</p>
              <p className="text-2xl">
                Total: <span className="text-primary">{brl(payableTotal)}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{benefits.freeShipping ? "Frete grátis nesta compra." : "Frete calculado na finalização."}</p>
              <button onClick={checkout} disabled={placing || validatingCoupon || promotionsLoading || promotionsError} className="btn-gold mt-6">
                {placing ? "Processando..." : "Finalizar pedido"}
              </button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
