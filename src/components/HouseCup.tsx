import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES, HOUSE_CHANGED_EVENT, percentage } from "@/lib/house-cup";

type Score = Record<string, number>;
const EMPTY: Score = { leao: 0, texugo: 0, aguia: 0, serpente: 0 };

export function HouseCup({ variant = "community" }: { variant?: "community" | "portal" }) {
  const [scores, setScores] = useState<Score>(EMPTY);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const portal = variant === "portal";

  const refresh = useCallback(async () => {
    try {
      const { data, error: resultError } = await (supabase as any).rpc("house_totals");
      if (resultError || !Array.isArray(data)) throw resultError || new Error("Placares indisponíveis");
      const next: Score = { ...EMPTY };
      for (const entry of data as { house: string; participant_count: number }[]) {
        if (entry.house in next) next[entry.house] = Number(entry.participant_count) || 0;
      }
      setScores(next); setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45000);
    window.addEventListener(HOUSE_CHANGED_EVENT, refresh);
    return () => { window.clearInterval(interval); window.removeEventListener(HOUSE_CHANGED_EVENT, refresh); };
  }, [refresh]);

  async function discoverHouse() {
    const { data } = await supabase.auth.getUser();
    window.location.assign(data.user
      ? "/comunidade?tab=perfil"
      : "/auth?mode=signup&source=house-cup&redirect=%2Fcomunidade");
  }

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return <section id={portal ? "portal-taca-casas" : undefined} aria-label="Taça das Casas"
    className={portal
      ? "relative isolate mx-auto w-full max-w-6xl overflow-hidden rounded-t-[2.5rem] border-x border-t border-[#98a9df]/45 bg-[#0c1232] px-3 pb-12 pt-12 text-[#f8f5ee] shadow-[0_-12px_55px_rgba(3,7,33,0.35)] sm:px-10 sm:pt-16 [background:radial-gradient(ellipse_at_top,#24305f_0%,#10183e_52%,#080c22_100%)]"
      : "mx-auto w-full max-w-5xl rounded-2xl border border-primary/30 bg-card px-4 py-8 text-foreground sm:px-8"}>
    {portal && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {["10%","28%","51%","76%","91%"].map((left,index)=>
        <span key={left} style={{left,top:index%2?"14%":"28%",animationDelay:index*0.5+"s"}}
          className="motion-safe:animate-pulse absolute h-1.5 w-1.5 rounded-full bg-[#f0d79b] shadow-[0_0_14px_3px_rgba(242,217,151,0.6)]" />)}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#070b22]/80 to-transparent"/>
    </div>}
    <div className="relative z-10 text-center">
      <p className={portal ? "text-[10px] font-semibold uppercase tracking-[.3em] text-[#edda9e]" : "text-[10px] font-semibold uppercase tracking-[.3em] text-primary"}>O Mundo da Magia</p>
      <h2 className="mt-3 font-display text-3xl sm:text-5xl">Taça das Casas</h2>
      <p className={portal ? "mx-auto mt-3 max-w-lg text-sm text-[#e5e8ff]" : "mx-auto mt-3 max-w-lg text-sm text-muted-foreground"}>
        Cada chama representa uma casa. Qual delas vai iluminar o nosso salão?
      </p>
      {error ? <p role="status" className="mt-8 text-sm">Não foi possível atualizar as porcentagens agora.</p> :
        <div className="mx-auto mt-9 grid max-w-2xl grid-cols-4 items-start gap-1.5 sm:gap-6">
          {HOUSES.map(house => <div key={house.id} className="flex min-w-0 flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-2xl shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:h-[84px] sm:w-[84px] sm:text-4xl"
              style={{backgroundColor:house.background,borderColor:house.border}}
              role="img" aria-label={house.label}>
              <span aria-hidden="true">{house.animal}</span>
            </div>
            <h3 className="mt-4 min-h-8 text-center text-[11px] font-semibold leading-4 sm:min-h-0 sm:text-sm">{house.label}</h3>
            <p className={portal ? "mt-1 font-display text-2xl tabular-nums text-[#f6dfa8] sm:text-4xl" : "mt-1 font-display text-2xl tabular-nums sm:text-4xl"}>
              {loading ? "—" : percentage(scores[house.id] ?? 0, total) + "%"}
            </p>
          </div>)}
        </div>}
      {!loading && !error && total === 0 && <p className={portal ? "mt-5 text-xs text-[#ced5ef]" : "mt-5 text-xs text-muted-foreground"}>
        Seja uma das primeiras pessoas a representar sua casa.
      </p>}
      <button type="button" onClick={() => void discoverHouse()}
        className={portal
          ? "mt-9 min-h-12 rounded-full border border-[#f0dba2] bg-[#e8d7a4] px-8 py-3 text-sm font-bold text-[#152045] shadow-[0_0_25px_rgba(233,211,151,0.18)] transition hover:bg-[#fff0ba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          : "btn-gold mt-9 min-h-12 rounded-full px-8 py-3 text-sm"}>
        Descubra a sua casa
      </button>
    </div>
  </section>;
}
