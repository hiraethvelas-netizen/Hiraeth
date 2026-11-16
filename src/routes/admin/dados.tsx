import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Search, Mail, MessageCircle, Users, RefreshCw, ShoppingBag, Flame, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { orderItemVariantLabel } from "@/lib/order-operations";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/dados")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dados e Clientes — Hiraeth" }] }),
  component: DadosEClientes,
});

type PortalCount = { slug:string; name:string; sessions:number };
type Insights = {
  registered_total:number; registered_period:number; community_total:number;
  known_app_accounts_period:number; known_portal_accounts_period:number;
  app_sessions_period:number; portal_sessions_period:number;
  portals:PortalCount[]; days:number;
};
type Customer = {
  id:string; email:string|null; phone:string|null; created_at:string;
  display_name:string; username:string|null; community_member:boolean;
  last_app_seen_at:string|null; last_portal_seen_at:string|null; last_portal_slug:string|null;
  orders_count:number; marketing_opt_in:boolean;
};
type CustomerPage = { customers:Customer[]; total:number; limit:number; offset:number };
type Purchase = {
  id:string; created_at:string; status:string; total:number; shipping:number;
  customer_name:string|null; customer_email:string|null; payment_status:string|null;
  shipping_address:Record<string,unknown>|null;
  items:Array<{product_name:string;quantity:number;unit_price:number;variant_details:unknown}>;
};
type CommunityInfo = {
  member:boolean; joined_at:string; username:string|null; bio:string|null;
  instagram_url:string|null; tiktok_url:string|null; other_social_url:string|null;
};
type Detail = {
  id:string; email:string|null; phone:string|null; display_name:string; created_at:string;
  marketing_opt_in:boolean; address:Record<string,unknown>|string|null;
  activity:{last_app_seen_at:string|null;last_portal_seen_at:string|null;last_portal_slug:string|null}|null;
  community:CommunityInfo|null; orders:Purchase[];
  posts:Array<{id:string;body:string;created_at:string;image_urls:string[]}>;
  interests:Array<{type:string;title:string;created_at:string}>;
};

function formatDate(iso:string|null|undefined):string {
  if (!iso) return "Não registrado";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Não registrado" :
    d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
}
function whatsappHref(phone:string|null):string|null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (/^\d{10,11}$/.test(digits)) digits = "55" + digits;
  return /^55\d{10,11}$/.test(digits) ? `https://wa.me/${digits}` : null;
}
function addressLines(value: Record<string,unknown>|string|null):string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  const str=(k:string)=>typeof value[k]==="string"?String(value[k]).trim():"";
  const line1=[str("street"),str("number")].filter(Boolean).join(", ");
  const line2=[str("neighborhood")||str("district"),str("city"),str("state")].filter(Boolean).join(" · ");
  return [line1,line2,str("cep")||str("postal_code"),str("complement")].filter(Boolean);
}

function ContactLinks({ email, phone, consent }: {email:string|null;phone:string|null;consent:boolean}) {
  const whatsapp = whatsappHref(phone);
  return <div className="mt-3 flex flex-wrap items-center gap-2">
    {email ? <a href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
      <Mail size={16}/> Abrir e-mail
    </a> : <span className="text-xs text-muted-foreground">E-mail indisponível</span>}
    {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
      <MessageCircle size={16}/> Abrir WhatsApp
    </a> : <span className="text-xs text-muted-foreground">WhatsApp não informado</span>}
    <span className="w-full text-xs text-muted-foreground">
      {consent ? "Consentiu receber novidades da Hiraeth. Confira o contexto antes de enviar." :
        "Sem autorização para divulgação promocional. Use estes contatos somente para atendimento legítimo ou pedidos."}
      {" "}O envio é manual e abre o aplicativo de e-mail ou WhatsApp.
    </span>
  </div>;
}

function CustomerDetail({ customer, onClose }: {customer:Customer;onClose:()=>void}) {
  const [detail,setDetail] = useState<Detail|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(()=>{
    let active = true;
    setDetail(null); setLoading(true); setError("");
    (supabase as any).rpc("hiraeth_admin_customer_detail",{p_user_id:customer.id})
      .then(({data,error}:{data:Detail|null;error:{message:string}|null})=>{
        if(!active)return;
        if(error || !data) setError("Não foi possível consultar a ficha desta pessoa.");
        else setDetail(data);
      }).catch(()=>{
        if(active)setError("Não foi possível carregar a ficha agora. A integração com os dados administrativos ainda pode estar em implantação.");
      }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[customer.id]);
  const info = detail ?? customer;
  return <section aria-label="Ficha da pessoa cadastrada" className="rounded-2xl border border-primary/50 bg-card p-4 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div><p className="eyebrow">Ficha de cliente</p>
        <h2 className="mt-2 font-display text-3xl text-foreground">{customer.display_name}</h2>
        <p className="mt-1 break-all text-sm text-muted-foreground">{customer.email || "Sem e-mail"} · Cadastro {formatDate(customer.created_at)}</p>
      </div>
      <button onClick={onClose} aria-label="Fechar ficha" className="rounded-full border border-primary/30 p-2 text-foreground hover:bg-primary/10"><X size={20}/></button>
    </div>
    <ContactLinks email={info.email} phone={info.phone} consent={info.marketing_opt_in}/>
    {loading && <p className="mt-5 text-sm text-muted-foreground">Carregando histórico…</p>}
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    {detail && <div className="mt-6 grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/20 p-4">
          <h3 className="font-semibold text-foreground">Cadastro e atividade</h3>
          <p className="mt-2 text-sm">Nome: {detail.display_name}</p>
          <p className="mt-1 break-all text-sm">E-mail: {detail.email || "Não informado"}</p>
          <p className="mt-1 text-sm">Telefone: {detail.phone || "Não informado"}</p>
          <p className="mt-1 text-sm">Último acesso ao app: {formatDate(detail.activity?.last_app_seen_at)}</p>
          <p className="mt-1 text-sm">Último acesso a portal: {formatDate(detail.activity?.last_portal_seen_at)}</p>
          {detail.activity?.last_portal_slug && <p className="mt-1 text-sm">Portal: {detail.activity.last_portal_slug}</p>}
          {addressLines(detail.address).length>0 &&
            <div className="mt-3 border-t border-primary/15 pt-3 text-sm">
              <strong>Endereço cadastrado</strong>
              {addressLines(detail.address).map((line,i)=><p key={i}>{line}</p>)}
            </div>}
        </div>
        <div className="rounded-xl border border-primary/20 p-4">
          <h3 className="font-semibold text-foreground">Círculo do Fogo</h3>
          <p className="mt-2 text-sm">{detail.community?.member ? "Participa da comunidade" : "Ainda não entrou na comunidade"}</p>
          {detail.community && <>
            {detail.community.username && <p className="mt-1 text-sm">Usuário: {detail.community.username}</p>}
            <p className="mt-1 text-sm">Entrou em: {formatDate(detail.community.joined_at)}</p>
            {detail.community.bio&&<p className="mt-2 whitespace-pre-wrap text-sm">{detail.community.bio}</p>}
          </>}
          <h4 className="mt-4 font-semibold text-foreground">Interesses compartilhados</h4>
          <p className="mt-1 text-sm text-muted-foreground">{detail.interests.length ?
            detail.interests.map(item=>item.title).join(" · ") : "Nenhum interesse cadastrado"}</p>
        </div>
      </section>
      <section className="rounded-xl border border-primary/20 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-foreground"><ShoppingBag size={18}/> Pedidos anteriores ({detail.orders.length}{detail.orders.length===50?"+":""})</h3>
        {detail.orders.length ? <div className="mt-3 space-y-3">
          {detail.orders.map(order=><details key={order.id} className="rounded-lg border border-primary/20 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              {formatDate(order.created_at)} · {order.status} · {brl(Number(order.total))}
            </summary>
            <div className="mt-3 text-sm">
              {order.items.map((item,i)=><div key={i} className="mt-2">
                <p>{item.quantity}× {item.product_name} — {brl(Number(item.unit_price)*item.quantity)}</p>
                {orderItemVariantLabel(item.variant_details as Json)&&
                  <p className="text-xs text-muted-foreground">{orderItemVariantLabel(item.variant_details as Json)}</p>}
              </div>)}
              <p className="mt-2 text-xs text-muted-foreground">Pagamento: {order.payment_status || "Não informado"} · Frete: {brl(Number(order.shipping))}</p>
              {addressLines(order.shipping_address).length>0 && <div className="mt-2 border-t border-primary/10 pt-2">
                <p className="font-medium">Endereço deste pedido</p>
                {addressLines(order.shipping_address).map((line,i)=><p key={i}>{line}</p>)}
              </div>}
            </div>
          </details>)}
        </div> : <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido vinculado a esta conta.</p>}
      </section>
      <section className="rounded-xl border border-primary/20 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-foreground"><Flame size={18}/> Publicações na comunidade ({detail.posts.length}{detail.posts.length===30?"+":""})</h3>
        {detail.posts.length ? <div className="mt-3 space-y-3">
          {detail.posts.map(post=><article key={post.id} className="border-b border-primary/15 pb-3">
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{post.body}</p>
            {post.image_urls?.length>0 && <div className="mt-2 flex flex-wrap gap-2">
              {post.image_urls.filter(url=>url.startsWith("https://")).slice(0,6).map((url,i)=>
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" title="Abrir imagem da publicação">
                  <img src={url} alt="Imagem publicada no Círculo do Fogo" loading="lazy"
                    className="h-20 w-20 rounded-lg border border-primary/20 object-cover"/>
                </a>)}
            </div>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
          </article>)}
        </div> : <p className="mt-2 text-sm text-muted-foreground">Nenhuma publicação na comunidade.</p>}
      </section>
    </div>}
  </section>;
}

function DadosEClientes() {
  const [period,setPeriod] = useState<7|30|90>(30);
  const [insights,setInsights] = useState<Insights|null>(null);
  const [insightsError,setInsightsError] = useState("");
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState<"all"|"app"|"portal"|"community">("all");
  const [page,setPage] = useState(0);
  const [customers,setCustomers] = useState<CustomerPage|null>(null);
  const [customersError,setCustomersError] = useState("");
  const [loading,setLoading] = useState(false);
  const [selected,setSelected] = useState<Customer|null>(null);

  const loadInsights = useCallback(async()=>{
    setInsightsError("");
    const { data,error } = await (supabase as any).rpc("hiraeth_admin_insights",{p_days:period});
    if(error) {setInsights(null);setInsightsError("A área de Dados e Clientes está aguardando ativação técnica no banco da Hiraeth. Seus cadastros e pedidos existentes não foram apagados.");}
    else setInsights(data as Insights);
  },[period]);

  const loadCustomers = useCallback(async()=>{
    setLoading(true);setCustomersError("");
    const { data,error } = await (supabase as any).rpc("hiraeth_admin_customers",{
      p_search:search.trim(),p_filter:filter,p_limit:20,p_offset:page*20,
    });
    if(error) {setCustomers(null);setCustomersError("A pesquisa de clientes ainda não está disponível. A atualização de segurança e consultas do banco precisa ser ativada pela administração técnica.");}
    else setCustomers(data as CustomerPage);
    setLoading(false);
  },[search,filter,page]);

  useEffect(()=>{void loadInsights();},[loadInsights]);
  useEffect(()=>{
    const timer = window.setTimeout(()=>{void loadCustomers();},250);
    return()=>window.clearTimeout(timer);
  },[loadCustomers]);

  const count=(value:number|undefined)=>Number(value||0).toLocaleString("pt-BR");
  const cards = insights ? [
    {label:"Acessos ao aplicativo",count:insights.app_sessions_period,explanation:"Entradas/sessões estimadas, incluindo visitantes sem conta"},
    {label:"Acessos aos portais NFC",count:insights.portal_sessions_period,explanation:"Aberturas dos links dos portais; não significa leitura física de NFC"},
    {label:"Pessoas cadastradas",count:insights.registered_total,explanation:`+${count(insights.registered_period)} cadastros no período`},
    {label:"Contas que acessaram o app",count:insights.known_app_accounts_period,explanation:"Contas identificadas após entrar; último acesso no período"},
    {label:"Contas que acessaram portais",count:insights.known_portal_accounts_period,explanation:"Somente visitantes que estavam conectados"},
    {label:"No Círculo do Fogo",count:insights.community_total,explanation:"Pessoas que aderiram à comunidade"},
  ] : [];

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="eyebrow">Relacionamento</p><h1 className="mt-2 font-display text-4xl text-foreground">Dados e Clientes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Entenda quem se cadastrou, quantos acessos o app e os portais receberam e acompanhe os relacionamentos da Hiraeth.
        </p>
      </div>
      <button type="button" onClick={()=>{void loadInsights();void loadCustomers();}}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10">
        <RefreshCw size={16}/> Atualizar
      </button>
    </header>

    <section className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-foreground"><BarChart3 size={22}/> Acessos e cadastros</h2>
        <label className="text-sm text-foreground">Período <select value={period}
          onChange={e=>setPeriod(Number(e.target.value) as 7|30|90)}
          className="ml-2 rounded-lg border border-primary/30 bg-background px-3 py-2 text-foreground">
          <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
        </select></label>
      </div>
      {insightsError && <p role="alert" className="mt-4 text-sm text-destructive">{insightsError}</p>}
      {!insights && !insightsError && <p className="mt-4 text-sm text-muted-foreground">Carregando indicadores…</p>}
      {!!insights && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(card=><div key={card.label} className="rounded-xl border border-primary/20 bg-background/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 font-display text-4xl text-primary">{count(card.count)}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.explanation}</p>
          </div>)}
        </div>
        {insights.portals.length>0 && <div className="mt-5">
          <h3 className="font-semibold text-foreground">Acessos por portal</h3>
          <div className="mt-2 space-y-2">{insights.portals.map(portal=><div key={portal.slug} className="flex items-center justify-between gap-2 border-b border-primary/15 py-2 text-sm">
            <span className="text-foreground">{portal.name}</span><strong>{count(portal.sessions)} entradas</strong>
          </div>)}</div>
        </div>}
      </>}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        A contagem começa quando o monitoramento estiver publicado e a migração aplicada; não recupera acessos anteriores.
        Uma sessão em outra aba ou dispositivo pode ser contada novamente. Visitantes anônimos entram apenas nas somas,
        sem nome, telefone, e-mail, endereço IP ou identificação individual.
      </p>
    </section>

    <section className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2"><Users size={22} className="text-primary"/>
        <h2 className="font-display text-2xl text-foreground">Base de clientes</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/40 bg-background px-3">
          <Search size={18} className="shrink-0 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);setSelected(null);}}
            maxLength={100} placeholder="Pesquisar nome, e-mail, telefone ou usuário da comunidade"
            aria-label="Pesquisar clientes" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"/>
        </label>
        <select value={filter} onChange={e=>{setFilter(e.target.value as typeof filter);setPage(0);setSelected(null);}}
          aria-label="Filtrar clientes"
          className="min-h-12 rounded-xl border border-primary/40 bg-background px-3 text-sm text-foreground">
          <option value="all">Todos os cadastrados</option>
          <option value="app">Acessaram o app</option>
          <option value="portal">Acessaram um portal NFC</option>
          <option value="community">Entraram na comunidade</option>
        </select>
      </div>
      {customersError&&<p role="alert" className="mt-4 text-sm text-destructive">{customersError}</p>}
      {loading&&<p className="mt-4 text-sm text-muted-foreground">Consultando clientes…</p>}
      {!loading&&customers&&<>
        <p className="mt-4 text-xs text-muted-foreground">{count(customers.total)} cadastro(s) encontrados. Pesquisa restrita à administração.</p>
        <div className="mt-3 grid gap-3">
          {customers.customers.map(customer=><article key={customer.id} className="rounded-xl border border-primary/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{customer.display_name}</h3>
                <p className="mt-1 break-all text-sm text-muted-foreground">{customer.email||"E-mail indisponível"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{customer.phone||"Telefone não cadastrado"} · Entrou em {formatDate(customer.created_at)}</p>
              </div>
              <button type="button" onClick={()=>setSelected(selected?.id===customer.id?null:customer)}
                className="rounded-full border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10">
                {selected?.id===customer.id?"Fechar ficha":"Ver ficha"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{customer.orders_count} pedido(s)</span>
              <span>{customer.community_member?"No Círculo do Fogo":"Sem comunidade"}</span>
              <span>App: {formatDate(customer.last_app_seen_at)}</span>
              {customer.marketing_opt_in&&<span>Autorizou novidades</span>}
            </div>
            {selected?.id===customer.id && <div className="mt-4"><CustomerDetail customer={customer} onClose={()=>setSelected(null)}/></div>}
          </article>)}
          {!customers.customers.length&&<p className="rounded-xl border border-primary/20 p-4 text-sm text-muted-foreground">
            Nenhuma pessoa encontrada para essa pesquisa.
          </p>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" disabled={page===0} onClick={()=>{setPage(Math.max(0,page-1));setSelected(null);}}
            className="rounded-full border border-primary/40 px-4 py-2 text-sm text-foreground disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground">Página {page+1}</span>
          <button type="button" disabled={(page+1)*20>=customers.total}
            onClick={()=>{setPage(page+1);setSelected(null);}}
            className="rounded-full border border-primary/40 px-4 py-2 text-sm text-foreground disabled:opacity-40">Próxima</button>
        </div>
      </>}
    </section>
  </div>;
}
