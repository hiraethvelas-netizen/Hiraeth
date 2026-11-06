import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileCheck2, FileText, PackageCheck, Printer, RefreshCw, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
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
  id:string;status:string;total:number;paid_at:string|null;last_error:string|null;email:string;
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
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [health,setHealth]=useState<IntegrationHealth|null>(null);
  const [healthError,setHealthError]=useState("");
  const [checkingHealth,setCheckingHealth]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [ordersResult,reviewResult]=await Promise.all([
        supabase.from("orders").select("id,status,payment_status,customer_name,customer_email,total,shipping,created_at,order_items(id,product_name,quantity)")
          .in("status",["paid","shipped","delivered"]).order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("commerce_checkouts")
          .select("id,status,total,paid_at,last_error,email")
          .eq("status","paid_attention").order("created_at",{ascending:false}).limit(100),
      ]);
      if(ordersResult.error||reviewResult.error)throw new Error(
        "A estrutura da expedição ainda não foi aplicada ao banco, ou faltam permissões.");
      setOrders((ordersResult.data??[]).filter(o=>o.payment_status==="approved") as unknown as Order[]);
      setAttention((reviewResult.data??[]) as PaymentReview[]);
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
      const {data,error:checkError}=await supabase.functions.invoke("commerce-checkout", {
        body:{action:"health"},
      });
      if(checkError || data?.error)throw new Error(data?.error||"Não foi possível consultar os serviços.");
      setHealth(data as IntegrationHealth);
    }catch(cause){
      setHealthError(cause instanceof Error?cause.message:"Consulta indisponível.");
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
