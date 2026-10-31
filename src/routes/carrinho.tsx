import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { requireAuthenticatedUser } from "@/lib/require-auth";

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
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const db = supabase as any;
  const payableTotal = Math.max(0, cart.total - couponDiscount);

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) { toast.error("Digite o código do cupom."); return; }
    setValidatingCoupon(true);
    const now = new Date().toISOString();
    const { data, error } = await db.from("promotions").select("*").eq("kind", "coupon").eq("code", code).eq("active", true).eq("visible", true).maybeSingle();
    setValidatingCoupon(false);
    if (error || !data || (data.starts_at && data.starts_at > now) || (data.ends_at && data.ends_at < now) || (data.usage_limit != null && data.usage_count >= data.usage_limit) || cart.total < Number(data.min_cart_value ?? 0)) {
      setCouponDiscount(0); setCouponCode(null); toast.error("Cupom inválido, expirado ou não aplicável a este carrinho."); return;
    }
    const discount = data.discount_type === "percent" ? cart.total * Number(data.discount_value) / 100 : Number(data.discount_value);
    setCouponDiscount(Math.min(cart.total, Math.max(0, discount)));
    setCouponCode(code);
    toast.success("Cupom aplicado.");
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
    const { data: products } = await supabase.from("products").select("id, name, stock").in("id", ids);
    for (const item of cart.items) {
      const p = products?.find((x) => x.id === item.productId);
      const variantStock = typeof item.variantDetails?.["stock"] === "number" ? item.variantDetails["stock"] : null;
      if (!p || (variantStock !== null ? variantStock < item.quantity : p.stock < item.quantity)) {
        toast.error(`Estoque insuficiente para "${item.name}".`);
        setPlacing(false);
        return;
      }
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        total: payableTotal,
        subtotal: cart.total,
        discount: couponDiscount,
        coupon_code: couponCode,
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
    if (itemError) { await db.from("orders").delete().eq("id", order.id); toast.error("Não foi possível salvar os itens do pedido."); setPlacing(false); return; }

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
                  </div>
                  <div className="flex items-center border">
                    <button onClick={() => cart.setQuantity(item.productId, item.quantity - 1, item.variantKey)} className="px-3 py-1">−</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button onClick={() => cart.setQuantity(item.productId, item.quantity + 1, item.variantKey)} className="px-3 py-1">+</button>
                  </div>
                  <span className="w-24 text-right text-primary">{brl(item.price * item.quantity)}</span>
                  <button onClick={() => cart.remove(item.productId, item.variantKey)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t pt-6 text-right">
              <div className="mb-5 flex gap-2"><input aria-label="Cupom de desconto" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Código do cupom" className="min-w-0 flex-1 border bg-transparent px-3 py-2 text-sm" /><button type="button" onClick={() => void applyCoupon()} disabled={validatingCoupon} className="border px-4 py-2 text-sm">{validatingCoupon ? "Verificando..." : "Aplicar cupom"}</button></div>
              {couponCode && <p className="mb-2 text-sm text-primary">Cupom {couponCode}: −{brl(couponDiscount)} <button className="ml-2 underline" onClick={() => {setCouponCode(null);setCouponDiscount(0);setCoupon("");}}>Remover</button></p>}
              <p className="text-sm text-muted-foreground">Subtotal: {brl(cart.total)}</p>
              <p className="text-2xl">
                Total: <span className="text-primary">{brl(payableTotal)}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Frete calculado na finalização.</p>
              <button onClick={checkout} disabled={placing} className="btn-gold mt-6">
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
