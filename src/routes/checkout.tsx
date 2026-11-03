import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CreditCard, Package, QrCode, ShieldCheck, Truck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({ meta: [{ title: "Finalizar compra — Hiraeth" }] }),
  component: CheckoutHiraeth,
});

type FreightQuote = { id: number; company: string; name: string; price: number; delivery_time: number | null };
type CheckoutSummary = {
  id: string; total: number; shipping: number; subtotal: number; discount: number; expires_at: string;
};
type PaymentOutcome = {
  checkoutId: string; paymentId?: string; status: string; orderId?: string | null;
  qrCode?: string | null; qrCodeBase64?: string | null;
};
type MercadoPagoInstance = {
  bricks: () => { create: (type: string, container: string, settings: Record<string,unknown>) => Promise<{ unmount: () => void }> };
};
declare global { interface Window { MercadoPago?: new (publicKey: string, options?: Record<string,unknown>) => MercadoPagoInstance } }

const emptyRecipient = {
  name:"", document:"", phone:"", postal_code:"", street:"", number:"",
  complement:"", district:"", city:"", state:"",
};
type RecipientField = keyof typeof emptyRecipient;

async function commerceCall(payload: Record<string,unknown>) {
  // Sandbox is admin-only on the server. Always send the signed-in user's
  // session, never an anonymous/public project API key.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Sua sessão expirou. Entre novamente para testar o checkout.");
  const { data, error } = await supabase.functions.invoke("commerce-checkout", {
    body: payload, headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw new Error(data?.error || "Não foi possível conectar ao checkout. Tente novamente.");
  if (data?.error) throw new Error(String(data.error));
  return data as Record<string,any>;
}

function SecureCardBrick({ publicKey, amount, email, onSubmit }: {
  publicKey:string; amount:number; email:string;
  onSubmit:(data:Record<string,unknown>)=>Promise<void>;
}) {
  const [problem,setProblem]=useState("");
  const [ready,setReady]=useState(false);
  const latestSubmit=useRef(onSubmit);
  latestSubmit.current=onSubmit;
  useEffect(()=>{
    let active=true, controller:{unmount:()=>void}|null=null;
    async function start() {
      try {
        if(!window.MercadoPago) {
          await new Promise<void>((resolve,reject)=>{
            const previous=document.querySelector<HTMLScriptElement>('script[data-hiraeth-mercadopago="1"]');
            if(previous && previous.dataset['ready']==="1") return resolve();
            if(previous) { previous.addEventListener("load",()=>resolve(),{once:true}); previous.addEventListener("error",()=>reject(new Error("SDK indisponível.")),{once:true}); return; }
            const script=document.createElement("script");
            script.src="https://sdk.mercadopago.com/js/v2";
            script.async=true; script.dataset['hiraethMercadopago']="1";
            script.onload=()=>{script.dataset['ready']="1";resolve();};
            script.onerror=()=>reject(new Error("Não foi possível carregar o formulário seguro."));
            document.head.appendChild(script);
          });
        }
        if(!active || !window.MercadoPago)return;
        const mp=new window.MercadoPago(publicKey,{locale:"pt-BR"});
        controller=await mp.bricks().create("cardPayment","hiraeth-mercadopago-card",{
          initialization:{amount,payer:{email}},
          customization:{visual:{style:{theme:"default"}}},
          callbacks:{
            onReady:()=>{if(active)setReady(true);},
            onSubmit:(data:Record<string,unknown>)=>latestSubmit.current(data),
            onError:()=>{if(active)setProblem("Não foi possível abrir o pagamento com cartão.");},
          },
        });
        if(!active)controller.unmount();
      }catch{
        if(active)setProblem("O formulário do Mercado Pago está indisponível. Você pode usar Pix.");
      }
    }
    void start();
    return ()=>{active=false;try{controller?.unmount();}catch{/* Provider owns iframe */}};
  },[publicKey,amount,email]);
  return <div className="mt-5 rounded-xl border border-primary/30 bg-[#f7f1e5] px-3 py-5 text-[#233628] sm:px-5">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#283d2d]">
      <CreditCard size={18}/> Cartão — formulário seguro do Mercado Pago
    </div>
    {!ready&&!problem&&<p className="pb-3 text-xs text-[#475c47]">Carregando pagamento seguro...</p>}
    {problem&&<p role="alert" className="pb-3 text-sm text-[#7d2e29]">{problem}</p>}
    <div id="hiraeth-mercadopago-card" />
    <p className="mt-4 flex gap-2 text-xs text-[#435641]"><ShieldCheck size={16} className="shrink-0"/>
      Os dados do cartão são enviados ao Mercado Pago. A Hiraeth não armazena número, validade ou código de segurança.
    </p>
  </div>;
}

function CheckoutHiraeth() {
  const cart=useCart();
  const [recipient,setRecipient]=useState(emptyRecipient);
  const [coupon,setCoupon]=useState("");
  const [config,setConfig]=useState<{enabled:boolean;publicKey:string|null;sandbox:boolean}|null>(null);
  const [quotes,setQuotes]=useState<FreightQuote[]>([]);
  const [selectedFreight,setSelectedFreight]=useState<number|null>(null);
  const [checkout,setCheckout]=useState<CheckoutSummary|null>(null);
  const [outcome,setOutcome]=useState<PaymentOutcome|null>(null);
  const [payerEmail,setPayerEmail]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [configIssue,setConfigIssue]=useState("");
  const [configAttempt,setConfigAttempt]=useState(0);

  const itemInputs=cart.items.map(item=>({
    productId:item.productId,quantity:item.quantity,variantKey:item.variantKey??"",
  }));
  const inputClass="mt-1 w-full min-w-0 rounded border border-primary/35 bg-card px-3 py-2.5 text-foreground placeholder:text-muted-foreground";
  useEffect(()=>{
    let active=true;
    setLoading(true);
    setConfigIssue("");
    const loadConfig=async()=>{
      try {
        // Wait for authentication to finish before requesting the same
        // signed-in checkout configuration used by ordinary shoppers.
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Sua sessão expirou. Entre novamente para testar o checkout.");
        const data = await commerceCall({action:"config"});
        if (!active) return;
        setConfig({enabled:!!data['enabled'],publicKey:data['publicKey']??null,sandbox:data['sandbox']!==false});
        setPayerEmail(auth.user.email??"");
        try{setCoupon(sessionStorage.getItem("hiraeth-checkout-coupon")??"");}catch{/* optional */}
        if (!data['enabled']) {
          // The API returns only failing setup field names, and only after
          // verifying this user is an administrator. Never show secret values.
          const issues = Array.isArray(data['setupIssues'])
            ? data['setupIssues'].filter((issue: unknown): issue is string =>
                typeof issue === "string" && /^[A-Z][A-Z0-9_]{2,90}$/.test(issue))
            : [];
          setConfigIssue(issues.length
            ? "Configurações que impedem a liberação: " + issues.join(", ") +
              ". Confira os valores na Lovable, sem copiar chaves aqui."
            : "Os pagamentos ainda não foram liberados pelo servidor. Confira as configurações do Mercado Pago e do Melhor Envio.");
        }
      } catch(cause) {
        if (!active) return;
        setConfig({enabled:false,publicKey:null,sandbox:true});
        setConfigIssue(cause instanceof Error?cause.message:"Não foi possível verificar o checkout.");
      } finally {
        if(active)setLoading(false);
      }
    };
    void loadConfig();
    return ()=>{active=false;};
  },[configAttempt]);

  async function quote() {
    if(busy)return;
    setBusy(true);setError("");setQuotes([]);setSelectedFreight(null);
    try{
      const data=await commerceCall({action:"quote",items:itemInputs,postalCode:recipient.postal_code});
      const list=(data['quotes']??[]) as FreightQuote[];
      if(!list.length)throw new Error("Nenhum frete disponível para este CEP.");
      setQuotes(list);
    }catch(cause){setError(cause instanceof Error?cause.message:"Falha no cálculo de frete.");}
    finally{setBusy(false);}
  }

  async function beginPayment(event:React.FormEvent) {
    event.preventDefault();
    if(busy||selectedFreight==null)return;
    setBusy(true);setError("");
    try{
      const data=await commerceCall({action:"init",items:itemInputs,recipient,
        freightServiceId:selectedFreight,couponCode:coupon.trim()});
      setCheckout(data['checkout'] as CheckoutSummary);
      setQuotes([]);
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(cause){setError(cause instanceof Error?cause.message:"Revise seus dados de entrega.");}
    finally{setBusy(false);}
  }

  async function pay(method:"pix"|"card",paymentData:Record<string,unknown>={}) {
    if(!checkout)throw new Error("Confira os dados antes de pagar.");
    if(busy)throw new Error("Aguarde a operação anterior.");
    setBusy(true);setError("");
    try{
      const data=await commerceCall({action:"pay",checkoutId:checkout.id,method,paymentData});
      const payment=data as PaymentOutcome;
      setOutcome(payment);
      if(payment.status==="paid") cart.clear();
      else if(payment.status==="paid_attention")
        setError("Pagamento recebido, mas o pedido precisa de revisão da Hiraeth. Não pague novamente.");
      else if(payment.status==="rejected") setError("Pagamento recusado. Para tentar novamente, revise a compra.");
      return;
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Não foi possível processar. Confira o status antes de repetir.");
      throw cause;
    }finally{setBusy(false);}
  }

  useEffect(()=>{
    if(!checkout||!outcome||!["pending","processing"].includes(outcome.status))return;
    let active=true;
    const refresh=async()=>{
      try{
        const data=await commerceCall({action:"status",checkoutId:checkout.id});
        const status=data['checkout']?.status;
        if(!active || !status)return;
        if(status==="paid"){
          setOutcome(old=>old?{...old,status,orderId:data['checkout'].order_id}:old);
          cart.clear();
        }else if(status==="paid_attention"){
          setOutcome(old=>old?{...old,status}:old);
          setError("Pagamento recebido e encaminhado para revisão. Não pague novamente.");
        }else if(status==="rejected"){
          setOutcome(old=>old?{...old,status}:old);
        }
      }catch{/* status will retry; payment is never retried automatically */}
    };
    const interval=window.setInterval(()=>{if(!document.hidden)void refresh();},15000);
    return ()=>{active=false;window.clearInterval(interval);};
  },[checkout,outcome?.status]);

  function update(field:RecipientField,value:string){setRecipient(prev=>({...prev,[field]:value}));}

  return <div className="min-h-screen min-w-0">
    <SiteHeader/>
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft size={16}/> Voltar à sacola</Link>
      <p className="eyebrow mt-8">O Correio da Fênix</p>
      <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Finalizar Compra</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Entrega, pagamento e acompanhamento do seu pedido, com segurança e sem sair da Hiraeth.
      </p>
      {loading&&<p role="status" className="mt-10 text-muted-foreground">Preparando checkout seguro...</p>}
      {config?.enabled&&config.sandbox&&<p role="status" className="mt-5 rounded-lg border border-primary/35 bg-card px-4 py-3 text-sm text-foreground">
        Ambiente de testes: você pode simular frete e pagamento, mas não será gerado um pedido real nem haverá envio.
        Não use cartão ou Pix reais nesta etapa.
      </p>}
      {!loading&&!config?.enabled&&<section className="mt-8 rounded-xl border border-primary/30 bg-card p-5">
        <h2 className="font-display text-2xl text-foreground">Pagamento em preparação</h2>
        <p className="mt-2 text-sm text-muted-foreground">O checkout ainda está em homologação. Nenhum valor será cobrado até a integração do Mercado Pago e do frete ser ativada com segurança.</p>
        {configIssue&&<p role="status" className="mt-3 text-sm text-foreground">{configIssue}</p>}
        <button type="button" onClick={()=>setConfigAttempt(n=>n+1)}
          className="mt-4 mr-3 border border-primary/50 px-4 py-2 text-sm text-primary">Verificar novamente</button>
        <Link to="/carrinho" className="btn-gold mt-5">Voltar à sacola</Link>
      </section>}
      {config?.enabled&&cart.items.length===0&&!outcome&&<p className="mt-8 text-muted-foreground">Sua sacola está vazia. Escolha suas velas antes de continuar.</p>}
      {error&&<p role="alert" className="mt-5 rounded-lg border border-[#c89b82] bg-[#3a211d] px-4 py-3 text-sm text-[#fff1e7]">{error}</p>}

      {config?.enabled&&cart.items.length>0&&!checkout&&(
        <form onSubmit={beginPayment} className="mt-8 space-y-6">
          <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
            <div className="flex items-center gap-2"><Package size={19} className="text-primary"/>
              <h2 className="font-display text-2xl text-foreground">Sua escolha</h2></div>
            <ul className="mt-4 space-y-2">
              {cart.items.map(item=><li key={item.productId+"-"+(item.variantKey??"")}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-primary/15 py-2 text-sm">
                <span className="text-foreground">{item.quantity}× {item.name}</span>
                <span className="text-primary">{brl(item.price*item.quantity)}</span>
              </li>)}
            </ul>
            <p className="mt-3 text-right font-medium text-foreground">Subtotal antes dos descontos: {brl(cart.total)}</p>
          </section>
          <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
            <div className="flex items-center gap-2"><Truck size={19} className="text-primary"/>
              <h2 className="font-display text-2xl text-foreground">Destino das chamas</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["name","Nome completo"],["document","CPF ou CNPJ"],["phone","Celular"],["postal_code","CEP"],
                ["street","Rua / Avenida"],["number","Número"],["complement","Complemento (opcional)"],
                ["district","Bairro"],["city","Cidade"],["state","UF"],
              ] as const).map(([field,label])=><label key={field} className={
                  field==="street"?"sm:col-span-2 text-sm text-foreground":"text-sm text-foreground"}>
                {label}
                <input value={recipient[field]} required={field!=="complement"}
                  maxLength={field==="postal_code"?9:field==="state"?2:140}
                  onChange={e=>{update(field,e.target.value);if(quotes.length)setQuotes([]);}}
                  className={inputClass} aria-label={label} autoComplete={
                    field==="postal_code"?"postal-code":field==="name"?"name":undefined}/>
              </label>)}
            </div>
            <button type="button" onClick={()=>void quote()} disabled={busy||!recipient.postal_code}
              className="mt-5 rounded-lg border border-primary/50 px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-40">
              {busy?"Consultando transportadoras...":"Calcular frete"}
            </button>
            {!!quotes.length&&<fieldset className="mt-5 space-y-2">
              <legend className="font-display text-xl text-foreground">Como prefere receber?</legend>
              {quotes.map(option=><label key={option.id}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 p-3 text-sm text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <span className="flex items-center gap-2">
                  <input type="radio" name="freight" value={option.id}
                    checked={selectedFreight===option.id} onChange={()=>setSelectedFreight(option.id)}/>
                  {option.company} — {option.name}
                  {option.delivery_time!=null&&<span className="text-xs text-muted-foreground">({option.delivery_time} dias estimados)</span>}
                </span>
                <strong className="text-primary">{brl(option.price)}</strong>
              </label>)}
            </fieldset>}
          </section>
          <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
            <label className="text-sm text-foreground">Cupom (opcional)
              <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())}
                placeholder="Código do cupom" className={inputClass}/>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">O servidor vai conferir preços, promoções e frete novamente antes de gerar o pagamento.</p>
          </section>
          <button type="submit" disabled={busy||selectedFreight==null}
            className="btn-gold w-full disabled:opacity-40">
            {busy?"Conferindo preços e estoque...":"Conferir e escolher o pagamento"}
          </button>
        </form>
      )}

      {config?.enabled&&checkout&&<section className="mt-8 rounded-xl border border-primary/30 bg-card p-4 sm:p-6">
        <h2 className="font-display text-2xl text-foreground">Pagamento protegido</h2>
        {config.sandbox&&<p className="mt-2 text-sm text-primary">Ambiente de testes — não representa compra real.</p>}
        <div className="mt-4 space-y-1 border-b border-primary/20 pb-4 text-sm">
          <p className="flex justify-between text-muted-foreground"><span>Produtos</span><span>{brl(checkout.subtotal)}</span></p>
          <p className="flex justify-between text-muted-foreground"><span>Descontos</span><span>−{brl(checkout.discount)}</span></p>
          <p className="flex justify-between text-muted-foreground"><span>Frete</span><span>{brl(checkout.shipping)}</span></p>
          <p className="mt-3 flex justify-between font-display text-2xl text-foreground"><span>Total</span><span className="text-primary">{brl(checkout.total)}</span></p>
        </div>
        {outcome?.status==="paid" ? <div role="status" className="mt-6 rounded-lg border border-primary/40 p-5 text-center">
          <h3 className="font-display text-2xl text-primary">{config.sandbox?"Pagamento de teste aprovado!":"Pagamento confirmado!"}</h3>
          <p className="mt-2 text-sm text-foreground">{config.sandbox
            ?"Simulação concluída. Nenhuma venda real foi criada e o estoque não foi alterado."
            :"Sua compra está registrada. Acompanhe tudo em Meus pedidos."}</p>
          {!config.sandbox&&<Link to="/pedidos" className="btn-gold mt-4">Ver meus pedidos</Link>}
        </div> : outcome?.status==="paid_attention" ? (
          <p role="alert" className="mt-5 text-sm text-foreground">{config.sandbox
            ?"O pagamento simulado precisa de conferência. Nenhuma venda real foi registrada."
            :"Seu pagamento foi recebido e precisa de conferência pela equipe Hiraeth. Não faça outro pagamento."}</p>
        ) : outcome?.qrCode ? <div className="mt-6 text-center">
          <h3 className="font-display text-xl text-foreground">Seu Pix está aguardando pagamento</h3>
          {outcome.qrCodeBase64&&<img alt="Código QR para pagamento Pix"
            src={"data:image/png;base64,"+outcome.qrCodeBase64}
            className="mx-auto mt-4 h-52 w-52 bg-white p-2"/>}
          <label className="mt-5 block text-left text-sm text-foreground">Código Pix copia e cola
            <textarea readOnly value={outcome.qrCode} rows={3} className={inputClass}/>
          </label>
          <button type="button" onClick={()=>void navigator.clipboard.writeText(outcome.qrCode!)}
            className="mt-3 rounded-lg border border-primary/45 px-4 py-2 text-sm text-primary">Copiar código Pix</button>
          <p className="mt-4 text-xs text-muted-foreground">O pedido será confirmado quando o Mercado Pago aprovar o pagamento. Nenhuma nova cobrança será feita ao atualizar esta tela.</p>
        </div> : outcome?.status==="pending" ? (
          <p role="status" className="mt-5 text-sm text-foreground">Pagamento em análise pelo Mercado Pago. Aguarde a confirmação.</p>
        ) : outcome?.status==="rejected" ? (
          <p role="alert" className="mt-5 text-sm text-foreground">Pagamento recusado. Revise seus dados e inicie uma nova tentativa sem cobranças duplicadas.</p>
        ) : <div className="mt-6 space-y-4">
          <button type="button" disabled={busy} onClick={()=>void pay("pix").catch(()=>{})}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-5 py-4 text-sm font-semibold text-foreground disabled:opacity-40">
            <QrCode size={19}/> {busy?"Aguarde...":"Pagar com Pix pelo Mercado Pago"}
          </button>
          {config.publicKey&&payerEmail&&(
            <SecureCardBrick publicKey={config.publicKey} amount={checkout.total} email={payerEmail}
              onSubmit={async formData=>{await pay("card",formData);}}/>
          )}
        </div>}
      </section>}
    </main>
    <SiteFooter/>
  </div>;
}
