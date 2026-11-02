import { SecretFlameCard } from "@/components/SecretFlameCard";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getPhoenixTarotVisitorKey,
  phoenixTarotScope,
  readPhoenixTarotClaim,
  savePhoenixTarotClaim,
  PHOENIX_TAROT_TITLE,
  PHOENIX_TAROT_SUBTITLE,
  PHOENIX_TAROT_INSTRUCTION,
  PHOENIX_TAROT_ROUTE,
  type PhoenixTarotClaim,
} from "@/lib/phoenix-tarot";

const SEEN_KEY = "hiraeth-secret-flames-seen-v1";

export function SecretFlamesPromotion() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [claim, setClaim] = useState<PhoenixTarotClaim | null>(null);
  const [scope, setScope] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data } = await (supabase as any).from("secret_flame_settings")
          .select("active,title,subtitle,candle_images,min_cart_value,starts_at,ends_at")
          .eq("id", true).maybeSingle();
        if (!alive || !data?.active) return;
        const now = Date.now();
        if (data.starts_at && new Date(data.starts_at).getTime() > now) return;
        if (data.ends_at && new Date(data.ends_at).getTime() < now) return;
        setSettings(data);
        const { data: auth } = await supabase.auth.getUser();
        if (!alive) return;
        const currentScope = phoenixTarotScope(auth.user?.id ?? null);
        setScope(currentScope);
        if (auth.user) {
          const { data: previous } = await (supabase as any).from("secret_flame_claims")
            .select("candle_index,reward_snapshot").eq("user_id", auth.user.id).maybeSingle();
          if (!alive) return;
          if (previous) {
            const existing: PhoenixTarotClaim = {
              candle_index: previous.candle_index,
              reward: previous.reward_snapshot,
              already_claimed: true,
            };
            savePhoenixTarotClaim(currentScope, existing);
            setClaim(existing);
            setOpen(true);
            return;
          }
        }
        const saved = readPhoenixTarotClaim(currentScope);
        if (saved) {
          setClaim(saved);
          setOpen(true);
          return;
        }
        // A customer who postponed the tarot is not interrupted on each visit.
        if (localStorage.getItem(SEEN_KEY) ||
            localStorage.getItem("hiraeth-secret-flames-completed")) return;
        localStorage.setItem(SEEN_KEY, "1");
        setOpen(true);
      } catch {
        // The store stays usable even if this optional experience is unavailable.
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function choose(index: number) {
    if (busy || claim) return;
    setBusy(true);
    setChosen(index);
    try {
      const { data, error } = await (supabase as any).rpc("claim_secret_flame", {
        p_candle_index: index,
        p_visitor_key: getPhoenixTarotVisitorKey(),
      });
      if (error || !data) throw new Error(error?.message || "Não foi possível registrar a sua escolha.");
      const result = data as PhoenixTarotClaim;
      savePhoenixTarotClaim(scope, result);
      setClaim(result);
      localStorage.setItem("hiraeth-secret-flames-completed", "1");
      setOpen(false);
      await navigate({ to: PHOENIX_TAROT_ROUTE });
    } catch (cause) {
      setChosen(null);
      toast.error(cause instanceof Error ? cause.message : "Não foi possível registrar a escolha. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function revisit() {
    if (!claim) return;
    savePhoenixTarotClaim(scope, claim);
    setOpen(false);
    void navigate({ to: PHOENIX_TAROT_ROUTE });
  }

  if (!settings || !open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07130d]/85 p-3 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-label={PHOENIX_TAROT_TITLE}>
      <section className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#bd9c58]/65 bg-[radial-gradient(ellipse_at_top,#28402e,#111f17_70%)] px-5 py-7 text-center text-[#f7efda] shadow-2xl sm:px-8 sm:py-9">
        <button type="button" onClick={() => setOpen(false)} aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full border border-[#d6bd88]/50 p-2 text-[#f7efda] hover:bg-white/10">
          <X size={18}/>
        </button>
        <Sparkles className="mx-auto mb-3 text-[#d6bd88]" size={25} aria-hidden="true"/>
        <p className="mx-auto mb-3 w-fit border-b border-[#bc9d66]/60 px-4 py-1 text-[10px] uppercase tracking-[.22em] text-[#dbc690]">
          Uma experiência Hiraeth
        </p>
        <h2 className="font-display text-4xl leading-tight sm:text-5xl">{PHOENIX_TAROT_TITLE}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm italic leading-relaxed text-[#ead7ad]">{!settings.subtitle || settings.subtitle === "Escolha uma vela e descubra a surpresa que ela guarda." ? PHOENIX_TAROT_SUBTITLE : settings.subtitle}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#f0e7d4]">
          {claim ? "Sua escolha já foi registrada. A Fênix ainda guarda a sua carta." : PHOENIX_TAROT_INSTRUCTION}
        </p>

        {!claim ? (
          <>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4">
              {[0, 1, 2, 3].map(index => (
                <button key={index} type="button" disabled={busy}
                  aria-label={`Escolher carta ${index + 1}`}
                  onClick={() => void choose(index)}
                  className={`group relative aspect-[4/5] overflow-hidden rounded-xl border border-[#c8a76d] bg-[#e9dfd7] p-1.5 transition-transform hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7efda] disabled:opacity-60 ${chosen === index ? "ring-2 ring-[#e4c891]" : ""}`}>
                  <SecretFlameCard index={index} imageUrl={settings.candle_images?.[index]?.image_url}/>
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-[#111c14]/85 px-2 py-1.5 text-xs font-medium text-[#f7efda]">
                    {busy && chosen === index ? "Guardando seu destino..." : `Escolher carta ${index + 1}`}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs text-[#dec99d]">Você pode escolher apenas uma carta.</p>
          </>
        ) : (
          <div className="mt-7 flex flex-col items-center">
            <div className="h-64 w-48 overflow-hidden rounded-xl border border-[#c8a76d] shadow-xl">
              <SecretFlameCard index={claim.candle_index} imageUrl={settings.candle_images?.[claim.candle_index]?.image_url}/>
            </div>
            <button type="button" onClick={revisit}
              className="mt-6 w-full rounded-xl border border-[#d6bd88] bg-[#d6bd88] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-[#1c2b20]">
              Rever minha carta
            </button>
          </div>
        )}
        <button type="button" onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-xl border border-[#d6bd88]/40 px-5 py-3 text-xs uppercase tracking-wide text-[#e9dac0] hover:bg-white/10">
          {claim ? "Voltar à loja" : "Escolher depois"}
        </button>
      </section>
    </div>
  );
}
