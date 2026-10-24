import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — Hiraeth" }] }),
  component: Pedidos,
});

function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <p className="eyebrow">Histórico</p>
        <h1 className="mt-2 text-5xl text-foreground">Meus pedidos</h1>

        {loading ? (
          <p className="mt-12 text-center text-muted-foreground">Consultando os arquivos...</p>
        ) : orders.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="font-display text-2xl italic text-primary">Nenhum pedido ainda</p>
            <Link to="/loja" className="btn-gold mt-6">Explorar a loja</Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {orders.map((o) => (
              <article key={o.id} className="border bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Pedido #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm uppercase tracking-widest text-primary">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <ul className="mt-4 space-y-1 text-foreground/85">
                  {o.order_items.map((i) => (
                    <li key={i.id}>
                      {i.quantity}× {i.product_name} — {brl(Number(i.unit_price) * i.quantity)}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right text-lg text-primary">Total: {brl(Number(o.total))}</p>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
