import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { managedVariants } from "@/lib/product-variants";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendas-manuais")({
  head: () => ({ meta: [{ title: "Vendas pelo WhatsApp — Hiraeth" }] }),
  component: ManualSalesPage,
});

type Candle = {
  id: string; name: string; status: string; product_type: string | null;
  stock: number; price: number; sale_price: number | null; variants: unknown;
};
type SaleLine = { id: string; productId: string; variantKey: string; quantity: number };
type SaleHistory = {
  id: string; customer_name: string; payment_method: string;
  created_at: string; total_catalog_reference: number;
  hiraeth_manual_sale_items: Array<{ product_name: string; variant_label: string; quantity: number }>;
};

const blank = (): SaleLine => ({ id: crypto.randomUUID(), productId: "", variantKey: "", quantity: 1 });
const inputClass = "mt-1.5 w-full rounded-lg border border-primary/30 bg-background px-3 py-3 text-foreground";
const paymentLabel: Record<string,string> = { pix:"Pix",credit:"Crédito",debit:"Débito",other:"Outro acordo" };

function ManualSalesPage() {
  const [products,setProducts]=useState<Candle[]>([]);
  const [history,setHistory]=useState<SaleHistory[]>([]);
  const [customerName,setCustomerName]=useState("");
  const [customerPhone,setCustomerPhone]=useState("");
  const [customerEmail,setCustomerEmail]=useState("");
  const [paymentMethod,setPaymentMethod]=useState("pix");
  const [isGift,setIsGift]=useState(false);
  const [note,setNote]=useState("");
  const [lines,setLines]=useState<SaleLine[]>([blank()]);
  const [confirmed,setConfirmed]=useState(false);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try {
      const [catalog,sales]=await Promise.all([
        supabase.from("products").select("id,name,status,product_type,stock,price,sale_price,variants")
          .eq("status","published").order("name"),
        (supabase as any).from("hiraeth_manual_sales")
          .select("id,customer_name,payment_method,created_at,total_catalog_reference,hiraeth_manual_sale_items(product_name,variant_label,quantity)")
          .order("created_at",{ascending:false}).limit(40),
      ]);
      if(catalog.error) throw catalog.error;
      if(sales.error) throw new Error("O controle de vendas manuais ainda não está habilitado no banco. A atualização do painel não altera o estoque até a migração ser aplicada.");
      setProducts(((catalog.data??[]) as Candle[]).filter(item=>item.product_type == null||item.product_type==="candle"));
      setHistory((sales.data??[]) as SaleHistory[]);
      setError("");
    } catch(e) {
      setError(e instanceof Error?e.message:"Não foi possível carregar o acervo e as vendas manuais.");
    } finally {
      setLoading(false);
    }
  },[]);
  useEffect(()=>{void load();},[load]);

  const updateLine=(id:string,change:Partial<SaleLine>)=>{
    setLines(previous=>previous.map(line=>line.id===id?{...line,...change}:line));
  };

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(saving||!confirmed)return;
    if(!lines.length||lines.some(line=>!line.productId||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>100)) {
      setError("Escolha as velas e informe quantidades válidas.");
      return;
    }
    if(lines.some(line=>{
      const product=products.find(p=>p.id===line.productId);
      return !product || (managedVariants(product.variants).length>0 && !line.variantKey);
    })){
      setError("Escolha a casa e o tamanho de cada vela com variações.");
      return;
    }
    if(!window.confirm("A venda já foi confirmada pelo WhatsApp? Ao registrar, o estoque de velas será reduzido. Nenhuma essência ou cobrança será movimentada."))return;
    setSaving(true);setError("");
    try{
      const {data,error:rpcError}=await (supabase as any).rpc("record_hiraeth_manual_sale",{
        p_request_id:requestId,
        p_customer_name:customerName.trim(),
        p_customer_phone:customerPhone.trim(),
        p_customer_email:customerEmail.trim(),
        p_items:lines.map(line=>({productId:line.productId,variantKey:line.variantKey,quantity:line.quantity})),
        p_payment_method:paymentMethod,
        p_is_gift:isGift,
        p_note:note.trim(),
        p_confirmed:true,
      });
      if(rpcError)throw rpcError;
      if(!data)throw new Error("Não recebemos confirmação do registro. Confira o histórico antes de tentar novamente.");
      toast.success("Venda registrada! Baixamos apenas as velas prontas, não as essências.");
      setRequestId(crypto.randomUUID());setLines([blank()]);
      setCustomerName("");setCustomerPhone("");setCustomerEmail("");
      setNote("");setIsGift(false);setConfirmed(false);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:"Não foi possível registrar a venda. Confira o estoque.");
    }finally{setSaving(false);}
  }

  return <div className="space-y-6">
    <header>
      <p className="text-xs uppercase tracking-[.22em] text-primary">O Correio da Fênix</p>
      <h1 className="mt-2 font-display text-4xl text-foreground">Vendas pelo WhatsApp</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground">
        Depois de confirmar a venda com a cliente, registre aqui as chamas escolhidas.
        O estoque das <strong>velas prontas</strong> diminui automaticamente, inclusive da casa e do tamanho certos.
        O estoque das <strong>essências não é alterado</strong>.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Este registro é um controle interno de vendas assistidas — não cobra, não gera nota fiscal,
        não envia etiqueta e não substitui o atendimento pelo WhatsApp.
      </p>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{error}</p>}
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-primary/30 bg-card p-4 sm:p-6">
      <h2 className="font-display text-2xl">Registrar venda confirmada</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Nome da cliente
          <input required maxLength={160} className={inputClass} value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
        </label>
        <label className="text-sm">Telefone do WhatsApp (opcional)
          <input maxLength={40} className={inputClass} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
        </label>
        <label className="text-sm">E-mail (opcional)
          <input type="email" maxLength={160} className={inputClass} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)}/>
        </label>
        <label className="text-sm">Pagamento combinado e confirmado
          <select className={inputClass} value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
            <option value="pix">Pix</option><option value="credit">Crédito</option>
            <option value="debit">Débito</option><option value="other">Outro acordo</option>
          </select>
        </label>
      </div>

      <section className="space-y-4">
        <h3 className="font-display text-xl">Velas vendidas</h3>
        {lines.map((line,index)=>{
          const product=products.find(p=>p.id===line.productId);
          const options=managedVariants(product?.variants);
          const variant=options.find(item=>item.key===line.variantKey);
          const available=variant?.stock??product?.stock??0;
          return <div key={line.id} className="rounded-lg border border-primary/25 bg-background/50 p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
              <label className="text-sm">Vela {index+1}
                <select required value={line.productId} className={inputClass}
                  onChange={e=>updateLine(line.id,{productId:e.target.value,variantKey:""})}>
                  <option value="">Selecione a vela</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.stock} disponíveis</option>)}
                </select>
              </label>
              <label className="text-sm">Variação
                <select value={line.variantKey} className={inputClass}
                  disabled={!options.length} required={options.length>0}
                  onChange={e=>updateLine(line.id,{variantKey:e.target.value})}>
                  <option value="">{options.length?"Escolha casa / tamanho":"Sem variação"}</option>
                  {options.map(v=><option key={v.key} value={v.key}>{v.label} · {v.stock} disponíveis</option>)}
                </select>
              </label>
              <label className="text-sm">Quantidade
                <input type="number" min={1} max={100} step={1} required value={line.quantity}
                  className={inputClass} onChange={e=>updateLine(line.id,{quantity:Number(e.target.value)})}/>
              </label>
            </div>
            {product&&<p className="mt-2 text-xs text-muted-foreground">
              Disponível nesta seleção: {available} unidade(s).
              Preço de catálogo: {brl(Number(variant?.sale_price??variant?.price??product.sale_price??product.price))}
            </p>}
            {lines.length>1&&<button type="button" className="mt-2 text-xs text-destructive underline" onClick={()=>setLines(prev=>prev.filter(row=>row.id!==line.id))}>Remover esta vela</button>}
          </div>;
        })}
        <button type="button" onClick={()=>setLines(prev=>[...prev,blank()])} disabled={lines.length>=30}
          className="rounded-lg border border-primary/40 px-4 py-2.5 text-sm text-primary disabled:opacity-50">+ Adicionar outra vela</button>
      </section>

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isGift} onChange={e=>setIsGift(e.target.checked)}/> É presente 🎁</label>
      <label className="block text-sm">Anotação interna da venda (opcional)
        <textarea maxLength={800} rows={3} value={note} className={inputClass}
          onChange={e=>setNote(e.target.value)} placeholder="Ex.: pedido fechado pelo WhatsApp, embalagem para presente, entrega combinada..."/>
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-background/60 p-4 text-sm">
        <input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 accent-primary"/>
        <span>Confirmei o pagamento e as quantidades com a cliente. Quero registrar esta venda e diminuir somente o estoque das velas prontas. Nenhuma essência será consumida.</span>
      </label>
      <button className="btn-gold w-full justify-center disabled:opacity-40" type="submit" disabled={saving||loading||!confirmed||products.length===0}>
        {saving?"Registrando sem duplicar...":"Registrar venda e baixar estoque das velas"}
      </button>
      <p className="text-xs text-muted-foreground">Se o registro falhar, não clique repetidamente. A operação possui proteção contra baixa duplicada.</p>
    </form>

    <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Histórico de vendas pelo WhatsApp</h2>
        <button type="button" onClick={()=>void load()} className="rounded-lg border border-primary/40 px-3 py-2 text-sm text-primary">Atualizar</button>
      </div>
      {loading?<p className="mt-4 text-sm text-muted-foreground">Carregando...</p>:
        history.length? <div className="mt-4 space-y-4">
          {history.map(sale=><article key={sale.id} className="rounded-lg border border-primary/20 p-4">
            <p className="font-semibold text-foreground">{sale.customer_name} · {new Date(sale.created_at).toLocaleString("pt-BR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pagamento confirmado manualmente: {paymentLabel[sale.payment_method]??sale.payment_method}. Referência do catálogo: {brl(Number(sale.total_catalog_reference))}</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {(sale.hiraeth_manual_sale_items??[]).map((item,i)=><li key={i}>{item.quantity}× {item.product_name}{item.variant_label?" — "+item.variant_label:""}</li>)}
            </ul>
          </article>)}
        </div>: <p className="mt-4 text-sm text-muted-foreground">Nenhuma venda manual registrada até agora.</p>}
      <Link to="/admin/produtos" className="mt-4 inline-block text-sm text-primary underline">Conferir estoque das velas no acervo</Link>
    </section>
  </div>;
}
