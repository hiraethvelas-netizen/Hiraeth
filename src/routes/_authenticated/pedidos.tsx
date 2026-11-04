import { OrderPromotionSummary } from "@/components/OrderPromotionSummary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import { orderDeliveryInfo, ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL, type ShipmentProgress } from "@/lib/order-details";

type Order = Tables<"orders"> & { promotion_summary?: unknown; order_items: Tables<"order_items">[] };

function variantLabel(details: Tables<"order_items">["variant_details"]) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = details as Record<string, unknown>;
  return [
    typeof value["size"] === "string" ? `Tamanho: ${value["size"]}` : "",
    typeof value["house"] === "string" ? `Casa: ${value["house"]}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}



export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — Hiraeth" }] }),
  component: Pedidos,
});

function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Record<string, ShipmentProgress>>({});
  const [trackingError, setTrackingError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setTrackingError("");
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error("Entre na sua conta para consultar seus pedidos.");
      const { data, error: ordersError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (ordersError) throw new Error("Não foi possível carregar seus pedidos.");
      const ownOrders = (data as Order[]) ?? [];
      setOrders(ownOrders);
      const nextShipments: Record<string, ShipmentProgress> = {};
      const ids = ownOrders.map(order => order.id);
      // Only the authenticated customer's own orders can be returned by this
      // server-side function; it never discloses private merchant or buyer data.
      for (let i = 0; i < ids.length; i += 100) {
        const { data: progress, error: progressError } = await (supabase as any)
          .rpc("get_my_order_tracking", { p_order_ids: ids.slice(i, i + 100) });
        if (progressError) {
          setTrackingError("O acompanhamento do envio está temporariamente indisponível. Seus pedidos continuam salvos.");
          break;
        }
        for (const shipment of (progress ?? []) as ShipmentProgress[])
          nextShipments[shipment.order_id] = shipment;
      }
      setShipments(nextShipments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar seus pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <p className="eyebrow">Histórico</p>
        <h1 className="mt-2 text-5xl text-foreground">Meus pedidos</h1>

        <button type="button" onClick={() => void load()} disabled={loading}
          className="mt-4 rounded border border-primary/40 px-4 py-2 text-sm text-primary disabled:opacity-50">
          Atualizar acompanhamento
        </button>
        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        {trackingError && !error && <p role="status" className="mt-5 text-sm text-muted-foreground">{trackingError}</p>}
        {loading ? (
          <p className="mt-12 text-center text-muted-foreground">Consultando os arquivos...</p>
        ) : !error && orders.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="font-display text-2xl italic text-primary">Nenhum pedido ainda</p>
            <Link to="/loja" className="btn-gold mt-6">Explorar a loja</Link>
          </div>
        ) : !error ? (
          <div className="mt-10 space-y-6">
            {orders.map((o) => {
              const shipment = shipments[o.id];
              const delivery = orderDeliveryInfo(o.shipping_address);
              return <article key={o.id} className="border bg-card p-6">
                <OrderPromotionSummary value={o.promotion_summary}/>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Pedido #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm uppercase tracking-widest text-primary">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </p>
                </div>
                <ul className="mt-4 space-y-1 text-foreground/85">
                  {o.order_items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.product_name} — {brl(Number(item.unit_price) * item.quantity)}
                      {variantLabel(item.variant_details) && <p className="text-xs text-muted-foreground">{variantLabel(item.variant_details)}</p>}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-primary/20 pt-4 text-sm text-foreground">
                  {delivery && <div className="space-y-1">
                    <p className="font-medium">{delivery.isGift ? "🎁 Presente para" : "Entrega para"} {delivery.name || "Destinatário"}</p>
                    {delivery.addressLines.map((line, i) => <p key={i} className="text-muted-foreground">{line}</p>)}
                  </div>}
                  {shipment ? <div className="mt-4 space-y-1">
                    <p><strong>Transportadora:</strong> {[shipment.carrier_name,shipment.service_name].filter(Boolean).join(" — ") || "A definir"}</p>
                    <p><strong>Situação do envio:</strong> {SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}</p>
                    {shipment.tracking_code
                      ? <p><strong>Código de rastreio:</strong> <span className="break-all">{shipment.tracking_code}</span></p>
                      : <p className="text-muted-foreground">O código de rastreio aparecerá aqui quando estiver disponível.</p>}
                  </div> : <p className="mt-3 text-muted-foreground">
                    {trackingError ? "Acompanhamento do envio indisponível no momento." : "Aguardando informações de expedição."}
                  </p>}
                </div>
                <p className="mt-4 text-right text-lg text-primary">Total: {brl(Number(o.total))}</p>
              </article>;
            })}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
