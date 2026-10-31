import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteContent } from "@/lib/admin-edit";
export const Route = createFileRoute("/admin/promocoes")({ component: PromocoesAdmin });
const blank = {name:"",kind:"coupon",code:"",discount_type:"percent",discount_value:"10",buy_quantity:"3",pay_quantity:"2",min_cart_value:"0",gift_name:"",visible:false,active:false,starts_at:"",ends_at:"",usage_limit:"",all_products:true};
function PromocoesAdmin(){
 const [items,setItems]=useState<any[]>([]); const [form,setForm]=useState(blank); const [editing,setEditing]=useState<string|null>(null); const [loading,setLoading]=useState(true); const db=supabase as any;
  const [flameSettings,setFlameSettings]=useState<any>({active:false,title:"O Segredo das Quatro Chamas",subtitle:"Escolha uma vela e descubra a surpresa que ela guarda.",candle_images:[{image_url:""},{image_url:""},{image_url:""},{image_url:""}],min_cart_value:"0",starts_at:"",ends_at:""});
  const [flameRewards,setFlameRewards]=useState<any[]>([0,1,2,3].map(candle_index=>({candle_index,reward_type:"message",reward_title:"",reward_description:"",coupon_code:""})));
  const [flameClaims,setFlameClaims]=useState<any[]>([]);
  const [savedWelcomeSettings,saveWelcomeSettings]=useSiteContent("customer-welcome-message",{
    enabled:false,
    title:"A chama da Hiraeth te recebe",
    message:"Que bom ter você aqui. Este é o seu espaço para encontrar histórias, aromas e lembranças que merecem permanecer acesas.",
    buttonText:"Seguir para o início",
  });
  const [welcomeSettings,setWelcomeSettings]=useState(savedWelcomeSettings);
  useEffect(()=>{setWelcomeSettings(savedWelcomeSettings);},[savedWelcomeSettings]);
  const [welcomeSaving,setWelcomeSaving]=useState(false);

 async function load(){setLoading(true);const {data,error}=await db.from("promotions").select("*").order("created_at",{ascending:false});if(error){toast.error("Não foi possível carregar promoções. A migração do banco precisa ser aplicada.");setLoading(false);return;}setItems(data??[]);setLoading(false)}
 useEffect(()=>{void load(); void loadFlames()},[]);
 async function loadFlames(){
   const [{data:s},{data:r},{data:c}] = await Promise.all([
     db.from("secret_flame_settings").select("*").eq("id",true).maybeSingle(),
     db.from("secret_flame_rewards").select("*").order("candle_index"),
     db.from("secret_flame_claims").select("id,user_id,candle_index,reward_snapshot,created_at").order("created_at",{ascending:false}).limit(100)
   ]);
   if(s) setFlameSettings({...s,min_cart_value:String(s.min_cart_value??0),starts_at:s.starts_at?.slice(0,16)??"",ends_at:s.ends_at?.slice(0,16)??"",candle_images:Array.from({length:4},(_,i)=>s.candle_images?.[i]??{image_url:""})});
   if(r) setFlameRewards([0,1,2,3].map(i=>r.find((x:any)=>x.candle_index===i)??{candle_index:i,reward_type:"message",reward_title:"",reward_description:"",coupon_code:""}));
   setFlameClaims(c??[]);
 }
 async function saveFlames(e:React.FormEvent){
   e.preventDefault();
   const settings={id:true,active:flameSettings.active,title:flameSettings.title,subtitle:flameSettings.subtitle,candle_images:flameSettings.candle_images,min_cart_value:Number(flameSettings.min_cart_value)||0,starts_at:flameSettings.starts_at?new Date(flameSettings.starts_at).toISOString():null,ends_at:flameSettings.ends_at?new Date(flameSettings.ends_at).toISOString():null,updated_at:new Date().toISOString()};
   const {error}=await db.from("secret_flame_settings").upsert(settings,{onConflict:"id"});
   if(error){toast.error("Não foi possível salvar a promoção: "+error.message);return;}
   const rewards=flameRewards.map((r:any)=>({...r,reward_title:r.reward_title.trim(),reward_description:r.reward_description.trim(),coupon_code:r.coupon_code.trim()||null,updated_at:new Date().toISOString()}));
   const {error:rewardError}=await db.from("secret_flame_rewards").upsert(rewards,{onConflict:"candle_index"});
   if(rewardError){toast.error("Configuração salva, mas houve erro nos benefícios: "+rewardError.message);return;}
   toast.success("O Segredo das Quatro Chamas foi salvo.");void loadFlames();
 }
 async function saveWelcome(e:React.FormEvent){
   e.preventDefault();setWelcomeSaving(true);
   try{await saveWelcomeSettings(welcomeSettings);toast.success("Mensagem de boas-vindas salva.");}
   catch(error){toast.error(error instanceof Error?error.message:"Não foi possível salvar a mensagem.");}
   finally{setWelcomeSaving(false);}
 }
 async function save(e:React.FormEvent){e.preventDefault();const payload={...form,discount_value:Number(form.discount_value)||0,min_cart_value:Number(form.min_cart_value)||0,buy_quantity:form.kind==="buy_x_pay_y"?Number(form.buy_quantity):null,pay_quantity:form.kind==="buy_x_pay_y"?Number(form.pay_quantity):null,usage_limit:form.usage_limit?Number(form.usage_limit):null,starts_at:form.starts_at?new Date(form.starts_at).toISOString():null,ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,code:form.kind==="coupon"?form.code.trim().toUpperCase():null,updated_at:new Date().toISOString()};const res=editing?await db.from("promotions").update(payload).eq("id",editing):await db.from("promotions").insert(payload);if(res.error){toast.error(res.error.message);return;}toast.success("Promoção salva.");setForm(blank);setEditing(null);void load()}
 async function toggle(p:any){const {error}=await db.from("promotions").update({active:!p.active,updated_at:new Date().toISOString()}).eq("id",p.id);if(error)toast.error(error.message);else void load()}
 async function remove(p:any){if(!confirm("Excluir "+p.name+"?"))return;const {error}=await db.from("promotions").delete().eq("id",p.id);if(error)toast.error(error.message);else void load()}
 const input="w-full border bg-background px-3 py-2 text-sm text-foreground";
 return <div><p className="text-xs uppercase tracking-widest text-primary">Marketing do Acervo</p><h1 className="mt-2 text-4xl text-foreground">Promoções</h1><p className="mt-2 text-sm text-muted-foreground">Configure cupons, descontos automáticos, leve X pague Y, frete grátis e brindes.</p>
 <form onSubmit={save} className="mt-8 space-y-4 border bg-card p-5"><h2 className="text-xl text-foreground">{editing?"Editar promoção":"Nova promoção"}</h2><div className="grid gap-4 md:grid-cols-2">
 <label className="text-sm text-foreground">Nome interno<input required className={input+" mt-1"} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
 <label className="text-sm text-foreground">Tipo<select className={input+" mt-1"} value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="coupon">Cupom de desconto</option><option value="automatic_discount">Desconto automático</option><option value="buy_x_pay_y">Leve X, pague Y</option><option value="free_shipping">Frete grátis</option><option value="gift">Compre e ganhe brinde</option></select></label>
 {form.kind==="coupon"&&<label className="text-sm text-foreground">Código do cupom<input required className={input+" mt-1"} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase().replace(/\\s/g,"")})}/></label>}
 {["coupon","automatic_discount"].includes(form.kind)&&<><label className="text-sm text-foreground">Tipo de desconto<select className={input+" mt-1"} value={form.discount_type} onChange={e=>setForm({...form,discount_type:e.target.value})}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label><label className="text-sm text-foreground">Valor do desconto<input type="number" min="0" step="0.01" className={input+" mt-1"} value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})}/></label></>}
 {form.kind==="buy_x_pay_y"&&<><label className="text-sm text-foreground">Leve<input type="number" min="2" className={input+" mt-1"} value={form.buy_quantity} onChange={e=>setForm({...form,buy_quantity:e.target.value})}/></label><label className="text-sm text-foreground">Pague<input type="number" min="1" className={input+" mt-1"} value={form.pay_quantity} onChange={e=>setForm({...form,pay_quantity:e.target.value})}/></label></>}
 {form.kind==="gift"&&<label className="text-sm text-foreground">Brinde<input className={input+" mt-1"} value={form.gift_name} onChange={e=>setForm({...form,gift_name:e.target.value})}/></label>}
 <label className="text-sm text-foreground">Valor mínimo do carrinho (R$)<input type="number" min="0" step="0.01" className={input+" mt-1"} value={form.min_cart_value} onChange={e=>setForm({...form,min_cart_value:e.target.value})}/></label>
 <label className="text-sm text-foreground">Início (opcional)<input type="datetime-local" className={input+" mt-1"} value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label><label className="text-sm text-foreground">Fim (opcional)<input type="datetime-local" className={input+" mt-1"} value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label><label className="text-sm text-foreground">Limite de usos (opcional)<input type="number" min="1" className={input+" mt-1"} value={form.usage_limit} onChange={e=>setForm({...form,usage_limit:e.target.value})}/></label></div>
 <div className="flex flex-wrap gap-5 border-t pt-4"><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.all_products} onChange={e=>setForm({...form,all_products:e.target.checked})}/>Toda a loja (regra de produtos/categorias será configurável na próxima etapa)</label><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Ativa</label><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})}/>Visível para clientes</label></div><div className="flex gap-3"><button className="btn-gold" type="submit">Salvar promoção</button>{editing&&<button type="button" className="border px-4 py-2 text-sm text-foreground" onClick={()=>{setForm(blank);setEditing(null)}}>Cancelar</button>}</div></form>
 <section className="mt-8"><h2 className="text-xl text-foreground">Promoções cadastradas</h2>{loading?<p className="mt-4 text-muted-foreground">Carregando...</p>:<div className="mt-4 space-y-3">{items.map(p=><article key={p.id} className="flex flex-wrap items-center justify-between gap-4 border bg-card p-4"><div><h3 className="text-foreground">{p.name}</h3><p className="mt-1 text-xs text-muted-foreground">{p.kind==="coupon"?"Cupom "+p.code:p.kind} · {p.active?"Ativa":"Pausada"} · {p.visible?"Visível":"Oculta"}</p></div><div className="flex gap-2"><button className="border px-3 py-2 text-sm text-foreground" onClick={()=>{setEditing(p.id);setForm({...blank,...p,discount_value:String(p.discount_value??0),min_cart_value:String(p.min_cart_value??0),buy_quantity:String(p.buy_quantity??3),pay_quantity:String(p.pay_quantity??2),starts_at:p.starts_at?.slice(0,16)??"",ends_at:p.ends_at?.slice(0,16)??"",usage_limit:p.usage_limit==null?"":String(p.usage_limit)})}}>Editar</button><button className="border px-3 py-2 text-sm text-foreground" onClick={()=>void toggle(p)}>{p.active?"Pausar":"Ativar"}</button><button className="border px-3 py-2 text-sm text-destructive" onClick={()=>void remove(p)}>Excluir</button></div></article>)}</div>}</section>
 <section className="mt-10 border border-primary/30 bg-card p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-primary">Experiência exclusiva</p><h2 className="mt-2 font-display text-2xl text-foreground">O Segredo das Quatro Chamas</h2><p className="mt-1 text-sm text-muted-foreground">Configure as quatro velas misteriosas e o benefício revelado após a escolha.</p></div><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={!!flameSettings.active} onChange={e=>setFlameSettings({...flameSettings,active:e.target.checked})}/>Promoção ativa</label></div>
  <form onSubmit={saveFlames} className="mt-6 space-y-5">
   <div className="grid gap-4 md:grid-cols-2">
    <label className="text-sm text-foreground">Título<input className={input+" mt-1"} value={flameSettings.title} onChange={e=>setFlameSettings({...flameSettings,title:e.target.value})}/></label>
    <label className="text-sm text-foreground">Texto de apresentação<input className={input+" mt-1"} value={flameSettings.subtitle} onChange={e=>setFlameSettings({...flameSettings,subtitle:e.target.value})}/></label>
    <label className="text-sm text-foreground">Compra mínima (R$)<input type="number" min="0" step="0.01" className={input+" mt-1"} value={flameSettings.min_cart_value} onChange={e=>setFlameSettings({...flameSettings,min_cart_value:e.target.value})}/></label>
    <label className="text-sm text-foreground">Início<input type="datetime-local" className={input+" mt-1"} value={flameSettings.starts_at} onChange={e=>setFlameSettings({...flameSettings,starts_at:e.target.value})}/></label>
    <label className="text-sm text-foreground">Fim<input type="datetime-local" className={input+" mt-1"} value={flameSettings.ends_at} onChange={e=>setFlameSettings({...flameSettings,ends_at:e.target.value})}/></label>
   </div>
   <div className="grid gap-4 sm:grid-cols-2">
    {[0,1,2,3].map(i=><div key={i} className="space-y-3 border p-4">
      <h3 className="font-display text-lg text-foreground">Vela misteriosa {i+1}</h3>
      <label className="block text-sm text-muted-foreground">URL da imagem<input className={input+" mt-1"} value={flameSettings.candle_images?.[i]?.image_url??""} placeholder="https://..." onChange={e=>setFlameSettings({...flameSettings,candle_images:flameSettings.candle_images.map((x:any,j:number)=>j===i?{...x,image_url:e.target.value}:x)})}/></label>
      {flameSettings.candle_images?.[i]?.image_url&&<img src={flameSettings.candle_images[i].image_url} alt={"Prévia da vela "+(i+1)} className="h-32 w-full rounded object-contain bg-background"/>}
      <label className="block text-sm text-muted-foreground">Tipo de benefício<select className={input+" mt-1"} value={flameRewards[i].reward_type} onChange={e=>setFlameRewards(flameRewards.map((r:any,j:number)=>j===i?{...r,reward_type:e.target.value}:r))}><option value="message">Brinde / mensagem</option><option value="coupon">Cupom</option><option value="free_shipping">Frete grátis</option><option value="gift">Brinde físico</option><option value="discount">Desconto</option></select></label>
      <label className="block text-sm text-muted-foreground">Nome do benefício<input required className={input+" mt-1"} value={flameRewards[i].reward_title} onChange={e=>setFlameRewards(flameRewards.map((r:any,j:number)=>j===i?{...r,reward_title:e.target.value}:r))}/></label>
      <label className="block text-sm text-muted-foreground">Detalhes / condições<textarea rows={2} className={input+" mt-1"} value={flameRewards[i].reward_description} onChange={e=>setFlameRewards(flameRewards.map((r:any,j:number)=>j===i?{...r,reward_description:e.target.value}:r))}/></label>
      <label className="block text-sm text-muted-foreground">Código do cupom (se houver)<input className={input+" mt-1"} value={flameRewards[i].coupon_code??""} onChange={e=>setFlameRewards(flameRewards.map((r:any,j:number)=>j===i?{...r,coupon_code:e.target.value.toUpperCase()}:r))}/></label>
    </div>)}
   </div>
   <button type="submit" className="btn-gold">Salvar configuração das Quatro Chamas</button>
  </form>
  <div className="mt-8 border-t pt-5"><h3 className="font-display text-xl text-foreground">Participações registradas</h3><p className="mt-1 text-xs text-muted-foreground">Últimas 100 escolhas registradas.</p>{flameClaims.length===0?<p className="mt-3 text-sm text-muted-foreground">Nenhuma participação registrada.</p>:<div className="mt-3 space-y-2">{flameClaims.map((c:any)=><div key={c.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>Vela {c.candle_index+1} · {c.reward_snapshot?.title??"Benefício"}</span><span className="text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span></div>)}</div>}</div>
 </section>
 <section className="mt-10 overflow-hidden rounded-xl border border-primary/30 bg-card shadow-sm">
  <div className="border-b border-primary/15 p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><p className="text-xs uppercase tracking-[.18em] text-primary">Mensagem para clientes</p><h2 className="mt-2 font-display text-2xl text-foreground">Boas-vindas Hiraeth</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Exibida em uma tela especial depois que a pessoa cria a conta ou entra novamente. O botão leva diretamente ao Início.</p></div>
    <label className="flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm text-foreground"><input type="checkbox" checked={!!welcomeSettings.enabled} onChange={e=>setWelcomeSettings({...welcomeSettings,enabled:e.target.checked})}/>Mensagem ativa</label>
   </div>
  </div>
  <form onSubmit={saveWelcome} className="space-y-4 p-5 sm:p-7">
   <label className="block text-sm text-foreground">Título principal<input required maxLength={100} className={input+" mt-1"} value={String(welcomeSettings.title??"")} onChange={e=>setWelcomeSettings({...welcomeSettings,title:e.target.value})}/></label>
   <label className="block text-sm text-foreground">Mensagem<textarea required maxLength={1000} rows={4} className={input+" mt-1"} value={String(welcomeSettings.message??"")} onChange={e=>setWelcomeSettings({...welcomeSettings,message:e.target.value})}/></label>
   <label className="block text-sm text-foreground">Texto do botão<input required maxLength={50} className={input+" mt-1"} value={String(welcomeSettings.buttonText??"")} onChange={e=>setWelcomeSettings({...welcomeSettings,buttonText:e.target.value})}/></label>
   <div className="overflow-hidden rounded-xl border border-[#9a7742]/50 bg-[radial-gradient(ellipse_at_top,rgba(181,139,67,0.22),transparent_55%),linear-gradient(135deg,#17251c,#263b2d_58%,#111b15)] px-6 py-10 text-center text-[#f7efda] shadow-inner sm:px-10 sm:py-14">
    <p className="text-[10px] uppercase tracking-[.32em] text-[#d7bd83]">Onde a Chama Acesa te Espera</p>
    <div className="my-4 text-3xl text-[#d7bd83]">✧</div>
    <h3 className="font-display text-3xl leading-tight sm:text-5xl">{String(welcomeSettings.title||"A chama da Hiraeth te recebe")}</h3>
    <p className="mx-auto mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-8 text-[#eee4ce] sm:text-base">{String(welcomeSettings.message||"")}</p>
    <span className="mt-8 inline-flex rounded-full border border-[#d7bd83]/70 bg-[#d7bd83] px-8 py-3 text-xs font-semibold uppercase tracking-[.16em] text-[#1e2a20]">{String(welcomeSettings.buttonText||"Seguir para o início")}</span>
   </div>
   <button type="submit" disabled={welcomeSaving} className="btn-gold">{welcomeSaving?"Salvando...":"Salvar mensagem de boas-vindas"}</button>
  </form>
 </section></div>
}
