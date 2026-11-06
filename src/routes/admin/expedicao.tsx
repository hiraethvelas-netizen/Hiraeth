import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileCheck2, FileText, PackageCheck, Printer, RefreshCw, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { isCancelledHealthCheck } from "@/lib/integration-health-errors";
import { orderDeliveryInfo } from "@/lib/order-details";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/expedicao")({
  ssr: false,
  head: () => ({ meta: [{ title: "Correio da Fênix — Expedição Hiraeth" }] }),
  component: CorreioDaFenix,
});

type Order = {
  id: string; status: string; payment_status: string | null;
  customer_name: string | null; customer_email: string | null;
  total: number; shipping: number; created_at: string;
  shipping_address: Json | null;
  order_items: Array<{id:string;product_name:string;quantity:number}>;
};
type Shipment = {
  id:string;status:string;provider_label_id:string|null;
  carrier_name:string|null;service_name:string|null;
  label_url:string|null;tracking_code:string|null;last_error:string|null;
};
type Invoice = {
  id:string;status:string;reference:string;access_key:string|null;
  nfe_number:string|null;danfe_url:string|null;last_error:string|null;
};
type ShippingDetails = {
  shipment: Shipment; invoice: Invoice; fiscalSandbox:boolean; shippingSandbox:boolean;
  canIssueInvoice:boolean;
};
type PaymentReview = {
  id:string;status:string;total:number;paid_at:string|null;last_error:string|null;email:string;promotion_summary?:unknown;
};

type SandboxAttempt = {
  id:string;status:string;total:number;created_at:string;
  payment_method:string|null;promotion_summary:unknown;
  recipient:Json|null;
};
function isSandboxRecord(value:unknown) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    (value as Record<string,unknown>)["sandbox"] === true;
}
const testStatusLabel:Record<string,string> = {
  awaiting_payment:"Aguardando simulação", pending:"Pagamento simulado pendente",
  processing:"Conferindo teste", paid:"Teste aprovado",
  paid_attention:"Teste precisa de revisão", rejected:"Teste recusado",
};

const stageName:Record<string,string> = {
  pending:"Aguardando",quoted:"Cotado",awaiting_label_payment:"Aguardando compra da etiqueta",
  label_paid:"Etiqueta comprada",generated:"Etiqueta pronta",posted:"Postado",
  delivered:"Entregue",authorized:"Autorizada",processing:"Processando",
  submitted:"Enviada",rejected:"Recusada",needs_configuration:"Configuração pendente",
  paid_attention:"Pagamento exige conferência",
};

async function freightAction(orderId:string,action:string,extra?:Record<string,unknown>) {
  const {data,error}=await supabase.functions.invoke("commerce-fulfillment", {
    body:{orderId,action,...extra},
  });
  if(error||data?.error)throw new Error(data?.error ?? "Não foi possível acessar a integração de expedição.");
  return data as Record<string,any>;
}

function OrderExpedition({order}:{order:Order}) {
  const delivery=orderDeliveryInfo(order.shipping_address);
  const [details,setDetails]=useState<ShippingDetails|null>(null);
  const [loading,setLoading]=useState(false);
  const [operation,setOperation]=useState("");
  async function refresh() {
    setLoading(true);
    try{setDetails((await freightAction(order.id,"status")) as ShippingDetails);}
    catch(cause){toast.error(cause instanceof Error?cause.message:"Integração indisponível.");}
    finally{setLoading(false);}
  }
  async function perform(action:string) {
    if(operation)return;
    if(action==="buy_label" && !window.confirm(
      "Confirmar a compra desta etiqueta no Melhor Envio? Ela poderá consumir saldo da sua carteira."
    ))return;
    if(action==="issue_invoice" && !window.confirm(
      "Enviar esta NF-e para autorização fiscal? Confirme os dados da empresa, produtos, NCM e tributação com a contabilidade."
    ))return;
    setOperation(action);
    try{
      const response=await freightAction(order.id,action,
        action==="buy_label"?{confirmPurchase:true}:undefined);
      toast.success(action==="buy_label"?"Compra da etiqueta solicitada.":
        action==="issue_invoice"?"Emissão fiscal solicitada.":
        action==="generate_label"?"Etiqueta gerada.": "Etapa atualizada.");
      await refresh();
      if(action==="generate_label"&&response['labelUrl']){
        window.open(response['labelUrl'],"_blank","noopener,noreferrer");
      }
    }catch(cause){
      toast.error(cause instanceof Error?cause.message:"Não foi possível executar esta etapa.");
    }finally{setOperation("");}
  }
  return <article className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl text-foreground">
          Pedido #{order.id.slice(0,8)} — {order.customer_name??"Cliente"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{order.customer_email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleString("pt-BR")} · {order.order_items.length} item(ns)
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{brl(Number(order.total))}</p>
        <p className="text-xs text-muted-foreground">Pago · frete {brl(Number(order.shipping))}</p>
      </div>
    </div>
    {delivery && (delivery.customerNote || delivery.packingVideoRequested || delivery.isGift) &&
      <section className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
        {delivery.isGift && <p className="font-medium">🎁 Pedido para presente — {delivery.name || "Destinatário"}</p>}
        <h4 className="mt-2 font-display text-lg text-primary">Recados para a Hiraeth</h4>
        {delivery.packingVideoRequested && <p className="mt-2 font-medium">
          🎥 Pedido de vídeo embalando a encomenda
        </p>}
        {delivery.customerNote && <p className="mt-2 whitespace-pre-wrap break-words">{delivery.customerNote}</p>}
        {!delivery.customerNote && !delivery.packingVideoRequested &&
          <p className="mt-1 text-xs text-muted-foreground">Sem recados adicionais.</p>}
      </section>}
    <button type="button" disabled={loading||!!operation} onClick={()=>void refresh()}
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm text-primary disabled:opacity-50">
      <RefreshCw size={16} aria-hidden="true"/> {loading?"Carregando...":"Ver expedição e nota fiscal"}
    </button>
    {details&&<div className="mt-5 grid gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-primary/20 bg-background/40 p-4">
        <div className="flex items-center gap-2"><FileText size={19} className="text-primary"/>
          <h4 className="font-display text-lg text-foreground">Nota fiscal (NF-e)</h4></div>
        <p className="mt-2 text-sm text-foreground">Situação: <strong>{stageName[details.invoice.status]??details.invoice.status}</strong></p>
        <p className="mt-1 text-xs text-muted-foreground">{details.fiscalSandbox?"Homologação: sem validade fiscal.":"Ambiente fiscal de produção."}</p>
        {details.invoice.nfe_number&&<p className="mt-2 text-xs text-foreground">Número: {details.invoice.nfe_number}</p>}
        {details.invoice.access_key&&<p className="mt-2 break-all text-xs text-muted-foreground">Chave: {details.invoice.access_key}</p>}
        {details.invoice.last_error&&<p role="alert" className="mt-2 text-xs text-destructive">{details.invoice.last_error}</p>}
        {!details.canIssueInvoice&&<p className="mt-3 text-xs text-muted-foreground">
          Configure as credenciais Focus NFe e a classificação fiscal aprovada pela contabilidade antes de emitir.
        </p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {details.invoice.status==="pending"&&<button type="button"
            disabled={!!operation||!details.canIssueInvoice}
            onClick={()=>void perform("issue_invoice")}
            className="rounded-lg border border-primary/50 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            <FileCheck2 size={15} className="mr-1 inline"/> Emitir NF-e
          </button>}
          {details.invoice.status!=="pending"&&<button type="button" disabled={!!operation}
            onClick={()=>void perform("refresh_invoice")}
            className="rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary disabled:opacity-40">
            Consultar nota
          </button>}
        </div>
      </section>
      <section className="rounded-lg border border-primary/20 bg-background/40 p-4">
        <div className="flex items-center gap-2"><Truck size={19} className="text-primary"/>
          <h4 className="font-display text-lg text-foreground">Etiqueta de envio</h4></div>
        <p className="mt-2 text-sm text-foreground">Situação: <strong>{stageName[details.shipment.status]??details.shipment.status}</strong></p>
        <p className="mt-1 text-xs text-muted-foreground">
          {details.shipment.carrier_name} · {details.shipment.service_name}
          {details.shippingSandbox?" · Melhor Envio Sandbox":""}
        </p>
        {details.shipment.tracking_code&&<p className="mt-2 text-xs text-foreground">Rastreio: {details.shipment.tracking_code}</p>}
        {details.shipment.last_error&&<p role="alert" className="mt-2 text-xs text-destructive">{details.shipment.last_error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {!details.shipment.provider_label_id&&<button type="button"
            disabled={!!operation||details.invoice.status!=="authorized"}
            onClick={()=>void perform("create_label")}
            className="rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            <PackageCheck size={15} className="mr-1 inline"/> Preparar etiqueta
          </button>}
          {details.shipment.status==="awaiting_label_payment"&&<button type="button"
            disabled={!!operation} onClick={()=>void perform("buy_label")}
            className="rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            Comprar etiqueta (confirmar custo)
          </button>}
          {["label_paid","generated"].includes(details.shipment.status)&&<button type="button"
            disabled={!!operation} onClick={()=>void perform("generate_label")}
            className="rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            <Printer size={15} className="mr-1 inline"/> Gerar / imprimir
          </button>}
          {details.shipment.label_url&&<a href={details.shipment.label_url}
            target="_blank" rel="noreferrer noopener"
            className="rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary">
            Abrir etiqueta
          </a>}
        </div>
        {details.invoice.status!=="authorized"&&<p className="mt-3 text-xs text-muted-foreground">
          Para envio comercial, a etiqueta só poderá ser criada após a autorização da NF-e.
        </p>}
      </section>
    </div>}
  </article>;
}

type ProviderStatus = "connected" | "rejected" | "unavailable" | "not_configured";
type IntegrationHealth = {
  sandbox: boolean;
  mercadoPago: ProviderStatus;
  melhorEnvio: ProviderStatus;
  packageWeightMeasured: boolean;
  fiscalSecretsPresent: boolean;
};

const PROVIDER_STATUS: Record<ProviderStatus,string> = {
  connected: "Credencial aceita pela API",
  rejected: "Credencial ou permissão recusada",
  unavailable: "Não foi possível conferir",
  not_configured: "Configuração ausente",
};

function CorreioDaFenix() {
  const [orders,setOrders]=useState<Order[]>([]);
  const [attention,setAttention]=useState<PaymentReview[]>([]);
  const [sandboxAttempts,setSandboxAttempts]=useState<SandboxAttempt[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [health,setHealth]=useState<IntegrationHealth|null>(null);
  const [healthError,setHealthError]=useState("");
  const [checkingHealth,setCheckingHealth]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [ordersResult,reviewResult,sandboxResult]=await Promise.all([
        supabase.from("orders").select("id,status,payment_status,customer_name,customer_email,total,shipping,created_at,shipping_address,order_items(id,product_name,quantity)")
          .in("status",["paid","shipped","delivered"]).order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("commerce_checkouts")
          .select("id,status,total,paid_at,last_error,email,promotion_summary")
          .eq("status","paid_attention").order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("commerce_checkouts")
          .select("id,status,total,created_at,payment_method,promotion_summary,recipient")
          .order("created_at",{ascending:false}).limit(50),
      ]);
      if(ordersResult.error||reviewResult.error||sandboxResult.error)throw new Error(
        "A estrutura da expedição ainda não foi aplicada ao banco, ou faltam permissões.");
      setOrders((ordersResult.data??[]).filter(o=>o.payment_status==="approved") as unknown as Order[]);
      setAttention(((reviewResult.data??[]) as PaymentReview[])
        .filter(record=>!isSandboxRecord(record.promotion_summary)));
      setSandboxAttempts(((sandboxResult.data??[]) as SandboxAttempt[])
        .filter(record=>isSandboxRecord(record.promotion_summary)));
      setError("");
    }catch(cause){setError(cause instanceof Error?cause.message:"Falha ao carregar expedição.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function checkIntegrations() {
    if (checkingHealth) return;
    setCheckingHealth(true);
    setHealth(null);
    setHealthError("");
    try {
      // Request the diagnostic using the signed-in admin session explicitly.
      // It is a read-only endpoint; no payment or shipment operation is retried.
      const {data:auth,error:authError}=await supabase.auth.getSession();
      const accessToken=auth.session?.access_token;
      if(authError || !accessToken)
        throw new Error("Sua sessão expirou. Entre novamente na administração da Hiraeth.");
      for(let attempt=0;attempt<2;attempt++){
        try {
          const {data,error:checkError}=await supabase.functions.invoke("commerce-checkout", {
            body:{action:"health"},
            headers:{Authorization:`Bearer ${accessToken}`},
          });
          if(data?.error)throw new Error(String(data.error));
          if(checkError)throw checkError;
          if(!data || typeof data.mercadoPago!=="string" || typeof data.melhorEnvio!=="string")
            throw new Error("O servidor não retornou o diagnóstico esperado.");
          setHealth(data as IntegrationHealth);
          return;
        }catch(cause){
          // A transient browser cancellation can happen on mobile networks.
          // Retry at most once, and only for this GET-only diagnostic.
          if(!isCancelledHealthCheck(cause) || attempt===1 || document.hidden) throw cause;
          await new Promise<void>(resolve=>window.setTimeout(resolve,300));
        }
      }
    }catch(cause){
      setHealthError(isCancelledHealthCheck(cause)
        ? "A consulta foi cancelada pela conexão ou pelo navegador. Nenhum pagamento foi realizado. Confira sua internet, mantenha a página aberta e toque em Verificar novamente."
        : cause instanceof Error?cause.message:"Não foi possível conferir as integrações.");
    }finally{setCheckingHealth(false);}
  }

  return <div className="space-y-7">
    <header>
      <p className="eyebrow">Correio da Fênix</p>
      <h1 className="mt-2 font-display text-4xl text-foreground">Expedição e Documentos</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Acompanhe pagamentos confirmados, emita a nota fiscal e prepare as etiquetas.
        As compras de etiquetas exigem confirmação e saldo no Melhor Envio.
        A emissão fiscal precisa dos dados tributários aprovados pela contabilidade.
      </p>
      <button type="button" onClick={()=>void load()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm text-primary">
        <RefreshCw size={16}/> Atualizar pedidos
      </button>
    </header>
    <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-5">
      <h2 className="font-display text-2xl text-foreground">Conferência das integrações</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Consulta de leitura para verificar se as credenciais de teste são aceitas.
        Não cria pagamentos, pedidos, etiquetas ou notas fiscais.
      </p>
      <button type="button" disabled={checkingHealth} onClick={()=>void checkIntegrations()}
        className="mt-3 rounded-lg border border-primary/50 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">
        {checkingHealth?"Conferindo...":"Verificar integrações de teste"}
      </button>
      {healthError&&<p role="alert" className="mt-3 text-sm text-destructive">{healthError}</p>}
      {health&&<div role="status" className="mt-4 space-y-2 text-sm text-foreground">
        <p><strong>Mercado Pago:</strong> {PROVIDER_STATUS[health.mercadoPago]??"Não verificado"}</p>
        <p><strong>Melhor Envio:</strong> {PROVIDER_STATUS[health.melhorEnvio]??"Não verificado"}</p>
        <p><strong>Embalagem pesada:</strong> {health.packageWeightMeasured?"Peso de embalagem configurado":"Falta confirmar peso físico da caixa e proteções"}</p>
        <p><strong>Documentação fiscal:</strong> {health.fiscalSecretsPresent?"Configurações fiscais presentes (não homologadas)":"Configurações fiscais incompletas"}</p>
        <p className="text-xs text-muted-foreground">
          Uma credencial aceita não comprova que pertence ao ambiente Teste nem que Pix,
          cartão, emissão fiscal ou etiquetas funcionam. Não autoriza vendas reais.
        </p>
      </div>}
    </section>
    {error&&<p role="alert" className="rounded border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}
    {loading&&<p className="text-muted-foreground">Carregando expedição...</p>}
    {!loading&&!error&&sandboxAttempts.length>0&&<section className="rounded-xl border border-primary/25 bg-card p-5">
      <h2 className="font-display text-2xl text-foreground">Histórico de pagamentos simulados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estes registros são apenas testes. Não representam vendas, não geram pedidos reais
        e não devem ser enviados pelo Correio da Fênix.
      </p>
      <div className="mt-3 space-y-3">
        {sandboxAttempts.map(test=>{
          const delivery=orderDeliveryInfo(test.recipient);
          return <div key={test.id} className="border-t border-primary/20 pt-3 text-sm text-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p><strong>Teste #{test.id.slice(0,8)}</strong> · {testStatusLabel[test.status]??test.status}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(test.created_at).toLocaleString("pt-BR")} · {test.payment_method??"Método ainda não selecionado"}
                </p>
              </div>
              <span className="font-semibold text-primary">{brl(Number(test.total))}</span>
            </div>
            {delivery && (delivery.isGift || delivery.customerNote || delivery.packingVideoRequested) &&
              <div className="mt-2 rounded-lg bg-primary/5 p-3">
                {delivery.isGift && <p>🎁 Presente para {delivery.name || "Destinatário"}</p>}
                {delivery.packingVideoRequested && <p>🎥 Solicitou vídeo embalando o pedido</p>}
                {delivery.customerNote && <p className="mt-1 whitespace-pre-wrap break-words">{delivery.customerNote}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Recados de teste; nenhuma encomenda real será preparada.</p>
              </div>}
          </div>;
        })}
      </div>
    </section>}
    {!!attention.length&&<section className="rounded-xl border border-[#c78b6a] bg-card p-5">
      <h2 className="font-display text-2xl text-foreground">Pagamentos que exigem revisão</h2>
      <p className="mt-1 text-sm text-muted-foreground">Esses pagamentos foram recebidos, mas não puderam gerar pedidos automaticamente. Verifique o estoque ou a conciliação antes de qualquer reembolso ou envio.</p>
      <div className="mt-3 space-y-3">
        {attention.map(record=><div key={record.id} className="border-t border-primary/20 pt-3 text-sm text-foreground">
          <strong>{record.email} · {brl(record.total)}</strong>
          <p className="text-xs text-muted-foreground">Checkout: {record.id}</p>
          <p className="text-xs text-[#a55d3d]">{record.last_error || "Revisão de pagamento."}</p>
        </div>)}
      </div>
    </section>}
    {!loading&&!error&&!orders.length&&<div className="rounded-xl border border-primary/25 bg-card p-6 text-center">
      <h2 className="font-display text-2xl text-foreground">Nenhuma chama pronta para envio</h2>
      <p className="mt-2 text-sm text-muted-foreground">Os pedidos pagos aparecerão aqui automaticamente.</p>
      <Link to="/admin/pedidos" className="mt-4 inline-block text-sm text-primary underline">Ver todos os pedidos</Link>
    </div>}
    <div className="space-y-4">{orders.map(order=><OrderExpedition key={order.id} order={order}/>)}</div>
  </div>;
}
