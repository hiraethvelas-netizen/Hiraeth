import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { percentage } from "@/lib/house-cup";

type MagicPoll = { id: string; question: string; options: string[] };
type Counts = Record<string, number[]>;
type MyVotes = Record<string, number>;

export function MagicPolls() {
  const [polls, setPolls] = useState<MagicPoll[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [votes, setVotes] = useState<MyVotes>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const [pollResponse, authResponse] = await Promise.all([
      (supabase as any).from("community_magic_polls").select("id,question,options").eq("active", true).order("position"),
      supabase.auth.getUser(),
    ]);
    if (pollResponse.error) { setError(true); return; }
    const rows = Array.isArray(pollResponse.data) ? pollResponse.data as MagicPoll[] : [];
    setPolls(rows); setError(false);
    const user = authResponse.data.user;
    setUserId(user?.id ?? null);
    if (!rows.length) return;
    const results = await Promise.all(rows.map(async poll => {
      const { data, error: resultError } = await (supabase as any).rpc("magic_poll_results", { p_poll: poll.id });
      return [poll.id, resultError ? [] : (data ?? [])] as const;
    }));
    setCounts(Object.fromEntries(results.map(([id, list]) => [
      id, rows.find(row => row.id === id)?.options.map((_, index) =>
        Number((list as { option_index: number; vote_count: number }[]).find(item => item.option_index === index)?.vote_count ?? 0)) ?? [],
    ])));
    if (user) {
      const { data: own } = await (supabase as any).from("community_magic_votes")
        .select("poll_id,option_index").eq("user_id", user.id).in("poll_id", rows.map(p => p.id));
      setVotes(Object.fromEntries((own ?? []).map((entry: {poll_id:string;option_index:number}) => [entry.poll_id, entry.option_index])));
    } else setVotes({});
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function vote(poll: MagicPoll, option: number) {
    if (!userId || saving) return;
    setSaving(poll.id);
    const { error: writeError } = await (supabase as any).from("community_magic_votes")
      .upsert({ poll_id: poll.id, user_id: userId, option_index: option }, { onConflict: "poll_id,user_id" });
    setSaving(null);
    if (writeError) { toast.error("Não foi possível salvar seu voto."); return; }
    await load();
  }

  if (error) return <p className="text-center text-sm">As perguntas estão indisponíveis neste momento.</p>;
  if (!polls.length) return null;
  const redirect = typeof window === "undefined" ? "/inicio" : window.location.pathname;
  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[#878e47]/30 bg-[#f7efda] px-4 py-7 text-[#26382d] sm:px-7">
      <p className="text-center text-xs font-semibold uppercase tracking-[.25em] text-[#5b1d04]">Círculo do Fogo</p>
      <h2 className="mt-2 text-center font-display text-3xl">Perguntas do Mundo da Magia</h2>
      <p className="mt-2 text-center text-sm text-[#57614d]">Não existe resposta certa. Compartilhe como você imagina cada história.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {polls.map(poll => {
          const totals = counts[poll.id] ?? poll.options.map(() => 0);
          const total = totals.reduce((sum, value) => sum + value, 0);
          const mine = votes[poll.id];
          return <article key={poll.id} className="rounded-xl border border-[#cfc9b4] bg-white/65 p-4 sm:p-5">
            <h3 className="font-display text-xl leading-snug">{poll.question}</h3>
            <div className="mt-4 space-y-2">{poll.options.map((label, index) => {
              const selected = mine === index;
              return <button type="button" key={index} disabled={!userId || saving === poll.id}
                aria-pressed={selected}
                onClick={() => void vote(poll,index)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed ${selected ? "border-[#5b1d04] bg-[#efe3d8]" : "border-[#d1c9b2] bg-white hover:border-[#878e47]"}`}>
                <span className="flex items-center justify-between gap-2"><span>{selected ? "✓ " : ""}{label}</span>{typeof mine === "number" && <span className="text-xs tabular-nums">{percentage(totals[index] ?? 0, total)}%</span>}</span>
                {typeof mine === "number" && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#e8e4d8]"><span className="block h-full rounded-full bg-[#878e47]" style={{width: `${percentage(totals[index] ?? 0,total)}%`}}/></span>}
              </button>;
            })}</div>
            {typeof mine === "number" ? <p className="mt-3 text-xs text-[#57614d]">{total} {total === 1 ? "voto" : "votos"} · Você pode trocar sua resposta.</p> :
              userId ? <p className="mt-3 text-xs text-[#57614d]">Escolha uma opção para ver os resultados.</p> :
              <a className="mt-3 inline-block text-xs font-semibold text-[#5b1d04] underline" href={`/auth?redirect=${encodeURIComponent(redirect)}`}>Entre ou crie sua conta para votar</a>}
          </article>;
        })}
      </div>
    </section>
  );
}
