import { OrderPromotionSummary } from "@/components/OrderPromotionSummary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { nextSafeOrderStatus, orderDeliveryInfo, ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL, type ShipmentProgress } from "@/lib/order-details";
import { orderItemVariantLabel, canRequestFinancialReview, financialReviewLabel, type RefundReview } from "@/lib/order-operations";

type Order = Tables<"orders"> & { promotion_summary?: unknown; order_items: Tables<"order_items">[] };


export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin Hiraeth" }] }),
  component: AdminPedidos,
});

function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Record<string, ShipmentProgress & {label_url?:string|null}>>({});
  const [invoices, setInvoices] = useState<Record<string, {status:string;danfe_url:string|null;xml_url:string|null;nfe_number:string|null}>>({});
  const [reviews, setReviews] = useState<RefundReview[]>([]);
  const [reviewWarning, setReviewWarning] = useState("");
  const [reviewForm, setReviewForm] = useState<{orderId:string;kind:"cancellation"|"refund"}|null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
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
      const nextShipments: Record<string, ShipmentProgress & {label_url?:string|null}> = {};
      const nextInvoices: Record<string, {status:string;danfe_url:string|null;xml_url:string|null;nfe_number:string|null}> = {};
      let warning = "";
      // Fetch only the tracking data for orders visible to administration.
      // If the logistics integration is missing, still show the orders.
      for (let i = 0; i < ids.length; i += 100) {
        const [shippingResult, invoiceResult] = await Promise.all([
          supabase.from("commerce_shipments")
            .select("order_id,status,carrier_name,service_name,tracking_code,updated_at,label_url")
            .in("order_id", ids.slice(i, i + 100)),
          supabase.from("commerce_invoices")
            .select("order_id,status,danfe_url,xml_url,nfe_number")
            .in("order_id", ids.slice(i, i + 100)),
        ]);
        const {data:shipping,error:shippingError}=shippingResult;
        if(!invoiceResult.error) for(const invoice of invoiceResult.data??[]) nextInvoices[invoice.order_id]=invoice;
        if (shippingError) {
          warning = "Os pedidos carregaram, mas os dados de expedição estão temporariamente indisponíveis.";
          break;
        }
        for (const shipment of shipping ?? [])
          nextShipments[shipment.order_id] = shipment;
      }
      setOrders(allOrders);
      setShipments(nextShipments);
      setInvoices(nextInvoices);
      setShipmentWarning(warning);
      const {data:financial, error:financialError}=await (supabase as any)
        .from("commerce_order_reviews")
        .select("id,order_id,kind,status,reason,created_at,updated_at")
        .order("created_at",{ascending:false}).limit(200);
      if(financialError){
        setReviews([]);
        setReviewWarning("A fila financeira ainda não foi habilitada no banco. Nenhum reembolso pode ser registrado por esta tela.");
      } else {
        setReviews((financial??[]) as RefundReview[]);
        setReviewWarning("");
      }
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
    const text=next==="preparing"
      ? "Iniciar a preparação deste pedido com pagamento confirmado?"
      : next==="shipped"
      ? "Você confirma que o pacote foi postado e entregue à transportadora?"
      : "Você confirma que a transportadora concluiu a entrega?";
    if (!window.confirm(text)) return;
    setUpdatingOrder(order.id);
    try {
      // The privileged RPC performs a second admin / paid-order / shipment
      // verification and updates the order and shipment atomically.
      const { error } = await (supabase as any).rpc("advance_order_delivery_status", {
        p_order_id: order.id, p_next_status: next,
      });
      if (error) throw error;
      toast.success(next==="preparing"?"Pedido em preparação."
        :next==="shipped"?"Postagem confirmada.":"Entrega confirmada.");
      await load();
    } catch {
      toast.error("Não foi possível atualizar a entrega. Confira as permissões e o status da expedição.");
    } finally {
      setUpdatingOrder(null);
    }
  }

  async function requestFinancialReview(order:Order) {
    if (!reviewForm || reviewForm.orderId!==order.id || submittingReview) return;
    if (reviewReason.trim().length<8 || reviewReason.trim().length>700) {
      toast.error("Informe um motivo entre 8 e 700 caracteres.");
      return;
    }
    if(!window.confirm("Registrar análise financeira? Isso NÃO cancela o pagamento nem devolve dinheiro."))
      return;
    setSubmittingReview(true);
    try {
      const {error}=await (supabase as any).rpc("request_commerce_order_review",{
        p_order_id:order.id,p_kind:reviewForm.kind,p_reason:reviewReason.trim(),
      });
      if(error)throw error;
      toast.success("Análise financeira registrada. Confira o pagamento no Mercado Pago.");
      setReviewForm(null);
      setReviewReason("");
      await load();
    }catch {
      toast.error("Não foi possível registrar a análise. Verifique as permissões e a migração.");
    }finally{setSubmittingReview(false);}
  }

  const filtered = orders.filter((o) => {
    if (filter==="financial_review" && !reviews.some(r=>r.order_id===o.id)) return false;
    if (filter && filter!=="financial_review" && o.status!==filter) return false;
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
          <option value="financial_review">Reembolso / cancelamento em análise</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {shipmentWarning && !loading && <p role="status" className="mt-4 text-sm text-muted-foreground">{shipmentWarning}</p>}
      {reviewWarning && !loading && <p role="status" className="mt-3 text-sm text-muted-foreground">{reviewWarning}</p>}
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
            const orderReviews=reviews.filter(review=>review.order_id===o.id);
            const hasOpenReview=orderReviews.some(review=>["pending_review","awaiting_provider"].includes(review.status));
            const invoice=invoices[o.id];
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
                    <span className="ml-2 text-xs text-muted-foreground">({brl(Number(item.unit_price))} cada)</span>
                    {orderItemVariantLabel(item.variant_details) && <p className="text-xs text-muted-foreground">{orderItemVariantLabel(item.variant_details)}</p>}
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
              {delivery && (delivery.customerNote || delivery.packingVideoRequested) && (
                <section className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
                  <h3 className="font-display text-lg text-primary">Recados para a Hiraeth</h3>
                  {delivery.packingVideoRequested && <p className="mt-2 font-medium">
                    🎥 Cliente gostaria de um vídeo embalando o pedido
                  </p>}
                  {delivery.customerNote && <p className="mt-2 whitespace-pre-wrap break-words">{delivery.customerNote}</p>}
                </section>
              )}
              <div className="mt-4 border-t border-primary/20 pt-3 text-sm text-foreground">
                <p><strong>Frete:</strong> {brl(Number(o.shipping))}</p>
                <p className="mt-1"><strong>Forma de pagamento:</strong> {o.payment_method==="pix"?"Pix":o.payment_method==="card"?"Cartão":o.payment_method??"Não informada"}</p>
                {o.payment_id&&<p className="mt-1 text-xs text-muted-foreground">Referência do pagamento: {o.payment_id}</p>}
                {shipment ? <>
                  <p className="mt-1"><strong>Transportadora:</strong> {[shipment.carrier_name, shipment.service_name].filter(Boolean).join(" — ") || "A definir"}</p>
                  <p className="mt-1"><strong>Expedição:</strong> {SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}</p>
                  {shipment.tracking_code && <p className="mt-1"><strong>Rastreio:</strong> {shipment.tracking_code}</p>}
                  {shipment.label_url?.startsWith("https://")&&
                    <a href={shipment.label_url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-block text-primary underline underline-offset-2">
                      Abrir etiqueta da transportadora
                    </a>}
                </> : <p className="mt-1 text-muted-foreground">Acompanhamento do envio ainda indisponível.</p>}
                {invoice&&<div className="mt-3 space-y-1">
                  <p><strong>Nota fiscal:</strong> {invoice.status}{invoice.nfe_number?` — nº ${invoice.nfe_number}`:""}</p>
                  {invoice.danfe_url?.startsWith("https://")&&
                    <a href={invoice.danfe_url} target="_blank" rel="noopener noreferrer"
                      className="mr-4 inline-block text-primary underline underline-offset-2">
                      Abrir DANFE / nota fiscal
                    </a>}
                  {invoice.xml_url?.startsWith("https://")&&
                    <a href={invoice.xml_url} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-primary underline underline-offset-2">
                      Arquivo XML da nota
                    </a>}
                </div>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link to="/admin/expedicao" className="text-sm text-primary underline underline-offset-2">
                    Abrir Correio da Fênix
                  </Link>
                  {nextStatus && !hasOpenReview && <button type="button"
                    disabled={Boolean(updatingOrder)}
                    onClick={() => void advanceDeliveryStatus(o, shipment)}
                    className="rounded border border-primary/50 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">
                    {updatingOrder === o.id ? "Atualizando..." :
                      nextStatus==="preparing"?"Iniciar preparação"
                      :nextStatus==="shipped"?"Marcar como enviado":"Marcar como entregue"
                  </button>}
                </div>
                {!nextStatus && ["paid","preparing","shipped"].includes(o.status) &&
                  <p className="mt-2 text-xs text-muted-foreground">
                    Para marcar como enviado, gere a etiqueta e confirme que o pacote foi postado. Depois confirme a entrega.
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
