import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type CandleImage = { image_url?: string; label?: string };
type Reward = { type?: string; title?: string; description?: string; coupon_code?: string };
type Claim = { already_claimed?: boolean; candle_index: number; reward: Reward };

const VISITOR_KEY = "hiraeth-secret-flames-visitor-v1";
const SEEN_KEY = "hiraeth-secret-flames-seen-v1";
function getVisitorKey() {
  let key = localStorage.getItem(VISITOR_KEY);
  if (!key) {
    key = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, key);
  }
  return key;
}

export function SecretFlamesPromotion() {
  const [settings, setSettings] = useState<any>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await (supabase as any).from("secret_flame_settings")
        .select("active,title,subtitle,candle_images,min_cart_value,starts_at,ends_at")
        .eq("id", true).maybeSingle();
      if (!alive || !data?.active) return;
      const now = Date.now();
      if (data.starts_at && new Date(data.starts_at).getTime() > now) return;
      if (data.ends_at && new Date(data.ends_at).getTime() < now) return;
      setSettings(data);
      const visitorKey = getVisitorKey();
      const { data: userData } = await supabase.auth.getUser();
      if (!alive) return;
      if (userData.user) {
        const { data: previous } = await (supabase as any).from("secret_flame_claims")
          .select("candle_index,reward_snapshot").eq("user_id", userData.user.id).maybeSingle();
        if (previous) {
          setClaim({ candle_index: previous.candle_index, reward: previous.reward_snapshot, already_claimed: true });
          return;
        }
      }
      if (localStorage.getItem(SEEN_KEY) || localStorage.getItem("hiraeth-secret-flames-completed")) return;
      localStorage.setItem(SEEN_KEY, "1");
      setOpen(true);
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function choose(index: number) {
    if (busy || claim) return;
    setBusy(true);
    setChosen(index);
    const { data, error } = await (supabase as any).rpc("claim_secret_flame", {
      p_candle_index: index,
      p_visitor_key: getVisitorKey(),
    });
    setBusy(false);
    if (error || !data) {
      setChosen(null);
      toast.error(error?.message || "Não foi possível registrar sua escolha. Tente novamente.");
      return;
    }
    setClaim(data as Claim);
    localStorage.setItem("hiraeth-secret-flames-completed", "1");
  }

  if (!settings || !open) return null;
  const images: CandleImage[] = Array.isArray(settings.candle_images) ? settings.candle_images : [];
  const reward = claim?.reward;
  const coupon = reward?.coupon_code;

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="O Segredo das Quatro Chamas">
    <section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-primary/25 bg-[#f7f0e6] p-5 text-center text-[#4d463e] shadow-2xl sm:p-8">
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-4 top-4 rounded-full border border-[#8b786b]/25 p-2"><X size={18}/></button>
      <Sparkles className="mx-auto mb-3 text-[#8b7650]" size={25}/>
      <p className="mx-auto mb-3 w-fit rounded-full bg-[#e9dfd1] px-4 py-1 text-[10px] font-semibold uppercase tracking-[.2em]">Uma surpresa da Hiraeth</p>
      <h2 className="font-display text-3xl leading-tight sm:text-4xl">{settings.title || "O Segredo das Quatro Chamas"}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#766b61]">{settings.subtitle || "Escolha uma vela e descubra a surpresa que ela guarda."}</p>
      {!claim ? <>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {[0,1,2,3].map(index => {
            const item = images[index] || {};
            return <button key={index} type="button" disabled={busy} onClick={() => void choose(index)} className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#d7c7b6] bg-[#e9dfd7] p-2 transition hover:-translate-y-1 hover:shadow-lg disabled:opacity-60 ${chosen === index ? "ring-2 ring-[#6d7955]" : ""}`}>
              {item.image_url ? <img src={item.image_url} alt={item.label || `Vela misteriosa ${index+1}`} className="h-full w-full rounded-xl object-contain"/> : <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-[#d8c9bd] to-[#9b847d] text-[#f7efda]"><span className="text-4xl">✧</span><span className="font-display text-lg">Chama {index+1}</span></div>}
              <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#342c2a]/65 px-2 py-1 text-xs text-[#f7efda]">{busy && chosen === index ? "Revelando..." : "Escolher esta vela"}</span>
            </button>;
          })}
        </div>
        <p className="mt-5 text-xs text-[#85796f]">Você pode escolher apenas uma vela.</p>
      </> : <div className="mt-7 rounded-2xl border border-[#d8c9b8] bg-card/95 p-6 text-card-foreground">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7eadf] text-[#66744f]"><Sparkles size={27}/></div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8b7650]">Sua surpresa foi revelada</p>
        <h3 className="mt-2 font-display text-2xl">{reward?.title || "Uma surpresa especial"}</h3>
        {reward?.description && <p className="mt-2 text-sm text-[#766b61]">{reward.description}</p>}
        {coupon && <button type="button" onClick={() => { void navigator.clipboard.writeText(coupon); setCopied(true); }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e9dfd7] px-4 py-2 text-sm font-semibold">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Cupom copiado" : coupon}</button>}
        {Number(settings.min_cart_value) > 0 && <p className="mt-3 text-xs text-[#85796f]">Válido em compras a partir de R$ {Number(settings.min_cart_value).toFixed(2).replace(".", ",")}.</p>}
        <p className="mt-4 text-xs text-[#85796f]">Esta participação já foi registrada e não poderá ser repetida.</p>
      </div>}
      <button type="button" onClick={() => setOpen(false)} className="mt-6 w-full rounded-xl bg-[#66744f] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-[#f7efda]">{claim ? "Continuar explorando" : "Escolher depois"}</button>
    </section>
  </div>;
}
