import { OrderPromotionSummary } from "@/components/OrderPromotionSummary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { nextSafeOrderStatus, orderDeliveryInfo, ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL, type ShipmentProgress } from "@/lib/order-details";

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



export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin Hiraeth" }] }),
  component: AdminPedidos,
});

function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Record<string, ShipmentProgress>>({});
  const [shipmentWarning, setShipmentWarning] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const allOrders = (data as Order[]) ?? [];
      const ids = allOrders.map(order => order.id);
      const nextShipments: Record<string, ShipmentProgress> = {};
      let warning = "";
      // Fetch only the tracking data for orders visible to administration.
      // If the logistics integration is missing, still show the orders.
      for (let i = 0; i < ids.length; i += 100) {
        const { data: shipping, error: shippingError } = await supabase
          .from("commerce_shipments")
          .select("order_id,status,carrier_name,service_name,tracking_code,updated_at")
          .in("order_id", ids.slice(i, i + 100));
        if (shippingError) {
          warning = "Os pedidos carregaram, mas os dados de expedição estão temporariamente indisponíveis.";
          break;
        }
        for (const shipment of shipping ?? [])
          nextShipments[shipment.order_id] = shipment;
      }
      setOrders(allOrders);
      setShipments(nextShipments);
      setShipmentWarning(warning);
      setLoadError(null);
    } catch {
      setLoadError("Não foi possível carregar os pedidos. Verifique sua conexão e as permissões de administrador.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function advanceDeliveryStatus(order: Order, shipment?: ShipmentProgress) {
    const next = nextSafeOrderStatus(order.status, order.payment_status, shipment?.status);
    if (!next || updatingOrder) return;
    const text = next === "shipped"
      ? "Você confirma que o pacote já foi entregue à transportadora? Marcar como Enviado?"
      : "Você confirma que a transportadora já entregou o pacote à cliente?";
    if (!window.confirm(text)) return;
    setUpdatingOrder(order.id);
    try {
      // The privileged RPC performs a second admin / paid-order / shipment
      // verification and updates the order and shipment atomically.
      const { error } = await (supabase as any).rpc("advance_order_delivery_status", {
        p_order_id: order.id, p_next_status: next,
      });
      if (error) throw error;
      toast.success(next === "shipped" ? "Postagem confirmada e pedido marcado como enviado." : "Entrega confirmada.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar a entrega. Confira as permissões e o status da expedição.");
    } finally {
      setUpdatingOrder(null);
    }
  }

  const filtered = orders.filter((o) => {
    if (filter && o.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customer_email ?? "").toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        (orderDeliveryInfo(o.shipping_address)?.name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inputCls =
    "border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <h1 className="text-4xl text-foreground">Pedidos</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input placeholder="Buscar por nº, e-mail ou nome" value={query} onChange={(e) => setQuery(e.target.value)} className={`flex-1 ${inputCls}`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
          <option value="">Todos os status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {shipmentWarning && !loading && <p role="status" className="mt-4 text-sm text-muted-foreground">{shipmentWarning}</p>}
      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : loadError ? (
        <div className="mt-8 border bg-card p-5 text-foreground">
          <p>{loadError}</p>
          <button onClick={load} className="btn-gold mt-3">Tentar novamente</button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {filtered.map((o) => {
            const delivery = orderDeliveryInfo(o.shipping_address);
            const shipment = shipments[o.id];
            const nextStatus = nextSafeOrderStatus(o.status, o.payment_status, shipment?.status);
            return <article key={o.id} className="border bg-card p-5">
              <OrderPromotionSummary value={o.promotion_summary}/>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-foreground">#{o.id.slice(0, 8)} · {o.customer_name || "Cliente sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{o.customer_email ?? "E-mail não informado"}</p>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg text-primary">{brl(Number(o.total))}</span>
                  <span className="rounded border border-primary/35 px-3 py-2 text-sm text-foreground">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Pagamento: {o.payment_status === "approved" ? "Confirmado" :
                  o.payment_status === "pending" ? "Pendente" : "Aguardando confirmação ou revisão"}
              </p>
              <ul className="mt-3 text-sm text-foreground/85">
                {o.order_items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.product_name} — {brl(Number(item.unit_price) * item.quantity)}
                    {variantLabel(item.variant_details) && <p className="text-xs text-muted-foreground">{variantLabel(item.variant_details)}</p>}
                  </li>
                ))}
              </ul>
              <details className="mt-4 border-t border-primary/20 pt-3 text-sm text-foreground">
                <summary className="cursor-pointer font-medium text-primary">
                  {delivery?.isGift ? "🎁 Presente — ver dados do destinatário" : "Ver dados de entrega"}
                </summary>
                {delivery ? <div className="mt-3 space-y-1 text-sm text-foreground">
                  <p><strong>Recebedor:</strong> {delivery.name || o.customer_name || "Não informado"}</p>
                  {delivery.document && <p><strong>CPF/CNPJ do destinatário:</strong> {delivery.document}</p>}
                  {delivery.phone && <p><strong>Telefone:</strong> {delivery.phone}</p>}
                  {delivery.addressLines.map((line, i) => <p key={i}>{line}</p>)}
                  {delivery.isGift && <>
                    <p className="pt-2 font-medium">Enviado como presente</p>
                    {delivery.buyerDocument && <p><strong>CPF/CNPJ da pessoa que comprou:</strong> {delivery.buyerDocument}</p>}
                    <p className="text-xs text-muted-foreground">Confira a documentação fiscal antes de enviar para terceiros.</p>
                  </>}
                </div> : <p className="mt-2 text-muted-foreground">Dados de entrega não registrados neste pedido.</p>}
              </details>
              <div className="mt-4 border-t border-primary/20 pt-3 text-sm text-foreground">
                <p><strong>Frete:</strong> {brl(Number(o.shipping))}</p>
                {shipment ? <>
                  <p className="mt-1"><strong>Transportadora:</strong> {[shipment.carrier_name, shipment.service_name].filter(Boolean).join(" — ") || "A definir"}</p>
                  <p className="mt-1"><strong>Expedição:</strong> {SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}</p>
                  {shipment.tracking_code && <p className="mt-1"><strong>Rastreio:</strong> {shipment.tracking_code}</p>}
                </> : <p className="mt-1 text-muted-foreground">Acompanhamento do envio ainda indisponível.</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link to="/admin/expedicao" className="text-sm text-primary underline underline-offset-2">
                    Abrir Correio da Fênix
                  </Link>
                  {nextStatus && <button type="button"
                    disabled={Boolean(updatingOrder)}
                    onClick={() => void advanceDeliveryStatus(o, shipment)}
                    className="rounded border border-primary/50 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">
                    {updatingOrder === o.id ? "Atualizando..." :
                      nextStatus === "shipped" ? "Marcar como enviado" : "Marcar como entregue"}
                  </button>}
                </div>
                {!nextStatus && ["paid","shipped"].includes(o.status) &&
                  <p className="mt-2 text-xs text-muted-foreground">
                    A geração da etiqueta libera a confirmação manual da postagem. A entrega é confirmada depois do envio.
                  </p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Pagamentos e reembolsos são controlados separadamente; alterar o status não realiza estorno.
                </p>
              </div>
            </article>;
          })}
        </div>
      )}
    </div>
  );
}
