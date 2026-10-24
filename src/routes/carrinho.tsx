import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Hiraeth" }] }),
  component: Carrinho,
});

function Carrinho() {
  const cart = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

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
      if (!p || p.stock < item.quantity) {
        toast.error(`Estoque insuficiente para "${item.name}".`);
        setPlacing(false);
        return;
      }
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        total: cart.total,
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

    await supabase.from("order_items").insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
      })),
    );

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
                <li key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden border bg-muted">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <Link to="/produto/$slug" params={{ slug: item.slug }} className="text-xl text-foreground hover:text-primary">
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{brl(item.price)} cada</p>
                  </div>
                  <div className="flex items-center border">
                    <button onClick={() => cart.setQuantity(item.productId, item.quantity - 1)} className="px-3 py-1">−</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button onClick={() => cart.setQuantity(item.productId, item.quantity + 1)} className="px-3 py-1">+</button>
                  </div>
                  <span className="w-24 text-right text-primary">{brl(item.price * item.quantity)}</span>
                  <button onClick={() => cart.remove(item.productId)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t pt-6 text-right">
              <p className="text-2xl">
                Total: <span className="text-primary">{brl(cart.total)}</span>
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
