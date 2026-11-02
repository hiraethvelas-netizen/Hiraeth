import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SecretFlameCard } from "@/components/SecretFlameCard";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  PHOENIX_TAROT_TITLE,
  phoenixTarotScope,
  readPhoenixTarotClaim,
  savePhoenixTarotClaim,
  type PhoenixTarotClaim,
} from "@/lib/phoenix-tarot";

type TarotSettings = { candle_images?: Array<{image_url?: string}>; min_cart_value?: number };

export const Route = createFileRoute("/taro-da-fenix")({
  ssr: false,
  head: () => ({ meta: [{ title: "O Tarô da Fênix — Hiraeth" }] }),
  component: PhoenixTarotReveal,
});

function PhoenixTarotReveal() {
  const [claim, setClaim] = useState<PhoenixTarotClaim | null>(null);
  const [settings, setSettings] = useState<TarotSettings>({});
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [auth, settingsResult] = await Promise.all([
          supabase.auth.getUser(),
          (supabase as any).from("secret_flame_settings")
            .select("candle_images,min_cart_value").eq("id", true).maybeSingle(),
        ]);
        if (!alive) return;
        if (!settingsResult.error && settingsResult.data) setSettings(settingsResult.data);
        const scope = phoenixTarotScope(auth.data.user?.id ?? null);
        let selected = readPhoenixTarotClaim(scope);
        // Recover the recorded choice for a customer who opens the result
        // on another device. Never call claim_secret_flame here: that would
        // accidentally create a new choice just by visiting this page.
        if (auth.data.user) {
          const { data: previous } = await (supabase as any)
            .from("secret_flame_claims")
            .select("candle_index,reward_snapshot")
            .eq("user_id", auth.data.user.id)
            .maybeSingle();
          if (!alive) return;
          if (previous) {
            selected = {
              candle_index: previous.candle_index,
              reward: previous.reward_snapshot,
              already_claimed: true,
            };
            savePhoenixTarotClaim(scope, selected);
          }
        }
        if (selected) setClaim(selected);
      } catch {
        // The page still offers a safe way back to the Acervo.
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!claim) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRevealed(true), reducedMotion ? 0 : 1250);
    return () => window.clearTimeout(timer);
  }, [claim]);

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Cupom copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código para copiar.");
    }
  }

  const reward = claim?.reward;
  const coupon = reward?.coupon_code?.trim();
  const imageUrl = claim ? settings.candle_images?.[claim.candle_index]?.image_url : undefined;

  return (
    <div className="min-h-screen bg-[#14251c] text-[#f7efda]">
      <SiteHeader />
      <main className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center px-4 pb-20 pt-10 text-center sm:pt-14">
        <Flame size={27} strokeWidth={1.5} className="text-[#d6bd88]" aria-hidden="true"/>
        <p className="mt-3 text-xs uppercase tracking-[.28em] text-[#e0c891]">Um destino revelado</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-[#f7efda] sm:text-5xl">{PHOENIX_TAROT_TITLE}</h1>
        {loading ? (
          <p role="status" className="mt-10 text-base text-[#e5d8b9]">Consultando a sua carta...</p>
        ) : !claim ? (
          <div className="mt-10 w-full rounded-xl border border-[#bc9d66] bg-[#203629] px-5 py-12">
            <Sparkles className="mx-auto text-[#d6bd88]" size={29}/>
            <h2 className="mt-4 font-display text-2xl">Sua carta ainda não foi encontrada</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#e5d8b9]">
              Acesse a promoção no Acervo Hiraeth para escolher uma carta. Uma escolha registrada não será repetida.
            </p>
            <Link to="/loja" className="mt-7 inline-flex rounded-full border border-[#d6bd88] px-6 py-3 text-sm font-semibold text-[#f7efda]">
              Voltar ao Acervo
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#e9dfc7]">
              A Fênix guardou uma surpresa especialmente para você.
            </p>
            <div className="phoenix-tarot-stage mt-9 h-[390px] w-[260px] max-w-full sm:h-[450px] sm:w-[300px]">
              <div data-testid="phoenix-tarot-flip" data-revealed={revealed ? "true" : "false"}
                className={`phoenix-tarot-flip h-full w-full ${revealed ? "is-revealed" : ""}`}>
                <div className="phoenix-tarot-face overflow-hidden rounded-2xl border-2 border-[#c9ae78] bg-[#e6d3af] p-2 shadow-[0_20px_48px_rgba(0,0,0,.5)]"
                  aria-hidden={revealed}>
                  <SecretFlameCard index={claim.candle_index} imageUrl={imageUrl}/>
                </div>
                <div className="phoenix-tarot-face phoenix-tarot-back flex flex-col items-center justify-center overflow-y-auto rounded-2xl border-2 border-[#c9ae78] bg-[radial-gradient(ellipse_at_top,#fdf4dd,#e0cfaa)] px-5 py-8 text-[#273b2b] shadow-[0_20px_48px_rgba(0,0,0,.5)]"
                  aria-hidden={!revealed}>
                  <Sparkles size={28} className="shrink-0 text-[#957542]" aria-hidden="true"/>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[.18em] text-[#705932]">A Carta Foi Revelada</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight text-[#273b2b]">{reward?.title || "Uma surpresa especial"}</h2>
                  {reward?.description && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#45513c]">{reward.description}</p>
                  )}
                  {coupon && (
                    <button type="button" disabled={!revealed} onClick={() => void copyCoupon(coupon)}
                      className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[#8c774b] bg-[#e7dabd] px-4 py-2 text-sm font-semibold text-[#283b2b]">
                      {copied ? <Check size={16}/> : <Copy size={16}/>}
                      <span className="break-all">{copied ? "Copiado: " + coupon : "Copiar " + coupon}</span>
                    </button>
                  )}
                  {Number(settings.min_cart_value) > 0 && (
                    <p className="mt-3 text-xs text-[#66533d]">
                      Para compras a partir de R$ {Number(settings.min_cart_value).toFixed(2).replace(".", ",")}.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {!revealed && (
              <button type="button" onClick={() => setRevealed(true)}
                className="mt-5 rounded-full border border-[#cfb37e] px-5 py-2 text-sm text-[#f7efda]">
                Revelar minha carta
              </button>
            )}
            {revealed && (
              <p className="mt-5 text-sm text-[#e9d9b6]">Sua escolha foi registrada e continuará sendo esta carta.</p>
            )}
            <Link to="/loja" className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-full bg-[#d6bd88] px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#1d2c20] hover:bg-[#ecd59e]">
              Seguir o destino da chama
            </Link>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
