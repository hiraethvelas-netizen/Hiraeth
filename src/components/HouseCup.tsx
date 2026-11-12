import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES, HOUSE_CHANGED_EVENT, percentage } from "@/lib/house-cup";
import { HouseBadge } from "@/components/HouseBadge";

type Score = Record<string, number>;
const EMPTY: Score = { leao: 0, texugo: 0, aguia: 0, serpente: 0 };

export function HouseCup() {
  const [scores, setScores] = useState<Score>(EMPTY);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error: queryError } = await (supabase as any).rpc("house_totals");
    setLoading(false);
    if (queryError) { setError(true); return; }
    const next = { ...EMPTY };
    for (const entry of (data ?? []) as { house: string; participant_count: number }[]) {
      if (entry.house in next) next[entry.house] = Number(entry.participant_count) || 0;
    }
    setScores(next); setError(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45000);
    window.addEventListener(HOUSE_CHANGED_EVENT, refresh);
    return () => { window.clearInterval(interval); window.removeEventListener(HOUSE_CHANGED_EVENT, refresh); };
  }, [refresh]);

  const total = Object.values(scores).reduce((sum, n) => sum + n, 0);
  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[#878e47]/40 bg-[#f7efda] px-4 py-7 text-[#253729] shadow-sm sm:px-7"
      aria-label="Taça das Casas">
      <p className="text-center text-xs font-semibold uppercase tracking-[.25em] text-[#5b1d04]">O Mundo da Magia</p>
      <h2 className="mt-2 text-center font-display text-3xl sm:text-4xl">Taça das Casas</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[#5c614c]">Cada participante representa sua casa. A contagem cresce com a nossa comunidade.</p>
      {error ? <p className="mt-6 text-center text-sm">O placar está indisponível no momento.</p> :
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HOUSES.map(h => (
            <div key={h.id} className="rounded-xl border border-[#d6cfbb] bg-white/65 px-3 py-4 text-center">
              <div className="flex justify-center"><HouseBadge house={h.id} large /></div>
              <p className="mt-2 text-xs font-semibold">{h.label}</p>
              <p className="mt-1 font-display text-3xl tabular-nums">{loading ? "—" : scores[h.id]}</p>
              <p className="text-xs text-[#5b654b]">{percentage(scores[h.id], total)}% dos participantes</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dcdccf]"><div className="h-full rounded-full"
                style={{ width: `${percentage(scores[h.id], total)}%`, backgroundColor: h.background }} /></div>
            </div>
          ))}
        </div>}
      {!error && <p className="mt-5 text-center text-xs text-[#5c614c]">{loading ? "Atualizando..." : `${total} ${total === 1 ? "participante" : "participantes"} na Taça das Casas`}</p>}
    </section>
  );
}
