import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { percentage } from "@/lib/house-cup";

type MagicPoll = { id: string; question: string; options: string[] };
type Counts = Record<string, number[]>;
type MyVotes = Record<string, number>;

export function MagicPolls({ variant = "community" }: { variant?: "community" | "portal" }) {
  const [polls, setPolls] = useState<MagicPoll[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [votes, setVotes] = useState<MyVotes>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const portal = variant === "portal";

  const load = useCallback(async () => {
    try {
      const [pollResponse, authResponse] = await Promise.all([
        (supabase as any).from("community_magic_polls")
          .select("id,question,options").eq("active", true).order("position"),
        supabase.auth.getUser(),
      ]);
      if (pollResponse.error) throw pollResponse.error;
      const rows = Array.isArray(pollResponse.data) ? pollResponse.data as MagicPoll[] : [];
      setPolls(rows);
      setError(false);
      const user = authResponse.data.user;
      setUserId(user?.id ?? null);
      if (!rows.length) return;
      const results = await Promise.all(rows.map(async poll => {
        const { data, error: resultError } = await (supabase as any)
          .rpc("magic_poll_results", { p_poll: poll.id });
        return [poll.id, resultError ? [] : (data ?? [])] as const;
      }));
      setCounts(Object.fromEntries(results.map(([id, list]) => [
        id, rows.find(row => row.id === id)?.options.map((_, index) =>
          Number((list as { option_index: number; vote_count: number }[])
            .find(item => item.option_index === index)?.vote_count ?? 0)) ?? [],
      ])));
      if (user) {
        const { data: own } = await (supabase as any).from("community_magic_votes")
          .select("poll_id,option_index").eq("user_id", user.id)
          .in("poll_id", rows.map(row => row.id));
        setVotes(Object.fromEntries((own ?? [])
          .map((entry: { poll_id: string; option_index: number }) =>
            [entry.poll_id, entry.option_index])));
      } else {
        setVotes({});
      }
    } catch (cause) {
      console.warn("Não foi possível carregar as perguntas.", cause);
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function vote(poll: MagicPoll, option: number) {
    if (saving) return;
    if (!userId) {
      const redirect = typeof window === "undefined" ? "/portal/o-mundo-de-magia" : window.location.pathname;
      window.location.assign("/auth?mode=signup&redirect=" + encodeURIComponent(redirect));
      return;
    }
    setSaving(poll.id);
    try {
      const { error: writeError } = await (supabase as any).from("community_magic_votes")
        .upsert({ poll_id: poll.id, user_id: userId, option_index: option },
          { onConflict: "poll_id,user_id" });
      if (writeError) throw writeError;
      setVotes(current => ({ ...current, [poll.id]: option }));
      await load();
      if (step < polls.length - 1) setStep(current => Math.min(current + 1, polls.length - 1));
      else setFinished(true);
    } catch {
      toast.error("Não foi possível salvar sua resposta. Tente novamente.");
    } finally {
      setSaving(null);
    }
  }

  if (error) return <p role="alert" className="mx-auto max-w-3xl p-5 text-center text-[#f4edda]">
    As perguntas estão indisponíveis neste momento.
  </p>;
  if (!polls.length) return null;

  const current = polls[Math.min(step, polls.length - 1)]!;
  const mine = votes[current.id];
  const totals = counts[current.id] ?? current.options.map(() => 0);
  const total = totals.reduce((sum, count) => sum + count, 0);
  const countAnswered = polls.filter(poll => typeof votes[poll.id] === "number").length;
  const sectionStyles = portal
    ? "relative isolate mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#718da3]/50 bg-[#182b3e] px-5 py-9 text-[#f7f5ff] shadow-[0_14px_48px_rgba(6,15,25,0.3)] sm:px-10 sm:py-12 [background:radial-gradient(ellipse_at_22%_14%,#293e55_0%,#1b2d42_49%,#142337_100%)]"
    : "relative mx-auto w-full max-w-5xl rounded-2xl border border-primary/30 bg-card px-5 py-8 text-foreground sm:px-8";
  return <section id={portal ? "portal-quiz-criativo" : undefined} className={sectionStyles}
    aria-label="Perguntas para criar a próxima coleção">
    {portal && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {([
        ["9%","15%","0s"],["85%","13%","0.7s"],["26%","80%","1.4s"],["93%","72%","1.8s"],
        ["72%","31%","0.5s"],["8%","64%","2.2s"],["54%","6%","0.3s"],
      ] as const).map(([left,top,delay]) => <span key={left + top} style={{ left, top, animationDelay: delay }}
        className="motion-safe:animate-pulse absolute h-1.5 w-1.5 rounded-full bg-[#fbebb4] opacity-65 shadow-[0_0_12px_3px_rgba(234,219,157,0.65)]" />)}
    </div>}
    <div className="relative z-10">
      <p className={portal ? "text-center text-xs font-semibold uppercase tracking-[.25em] text-[#e7d7a2]" : "text-center text-xs font-semibold uppercase tracking-[.25em] text-primary"}>
        O Mundo da Magia · Um convite da Guardiã
      </p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-3xl leading-tight sm:text-4xl">
        Ajude a Hiraeth a criar o próximo capítulo
      </h2>
      <p className={portal ? "mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-[#ecedff] sm:text-base" : "mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-foreground"}>
        Que sensações você gostaria de viver nas cenas do Mundo da Magia? Conte o que imagina, sente e gostaria de transformar nos próximos portais da coleção.
      </p>
      {!open ? <div className="mt-7 text-center">
        <button type="button" onClick={() => { setOpen(true); setFinished(false); setStep(0); }}
          className={portal ? "min-h-12 rounded-full border border-[#e6d5a3] bg-[#e8d59c] px-7 py-3 text-sm font-bold text-[#182b3e] shadow-[0_0_25px_rgba(219,194,126,0.2)] transition hover:bg-[#fff0bb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" : "btn-gold min-h-12 rounded-full px-7 py-3 text-sm"}>
          Ajude a criar a próxima coleção ✦
        </button>
        <p className={portal ? "mt-3 text-xs text-[#d4dcff]" : "mt-3 text-xs text-muted-foreground"}>10 perguntas rápidas · Não existe resposta errada</p>
      </div> : finished ? <div className="mx-auto mt-8 max-w-xl text-center">
        <div className="mb-3 text-4xl" aria-hidden="true">✧</div>
        <h3 className="font-display text-2xl">Sua imaginação já faz parte desta história.</h3>
        <p className="mt-3 text-sm leading-6">Obrigada por compartilhar suas ideias! Você respondeu {countAnswered} de {polls.length} perguntas.</p>
        <button type="button" onClick={() => { setFinished(false); setStep(0); }}
          className="mt-6 min-h-11 rounded-full border border-[#d7cb9c] px-5 py-2 text-sm font-semibold text-inherit">
          Rever minhas respostas
        </button>
      </div> : <div className={portal ? "mx-auto mt-7 max-w-2xl rounded-2xl border border-[#91a5ba]/60 bg-[#14253a]/90 p-5 text-[#fff9ed] shadow-xl sm:p-7" : "mx-auto mt-7 max-w-2xl rounded-2xl border border-border bg-background p-5 sm:p-7"}>
        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
          <span>Pergunta {step + 1} de {polls.length}</span>
          <span>{Math.round(((step + 1) / polls.length) * 100)}%</span>
        </div>
        <div className={portal ? "mt-3 h-1.5 overflow-hidden rounded-full bg-[#425c6e]" : "mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"}>
          <div className={portal ? "h-full rounded-full bg-[#f5dc9d]" : "h-full rounded-full bg-primary"} style={{ width: ((step + 1) / polls.length) * 100 + "%" }}/>
        </div>
        <h3 className="mt-6 font-display text-xl leading-snug sm:text-2xl">{current.question}</h3>
        <div className="mt-5 grid gap-3">
          {current.options.map((label, index) => <button type="button" key={index}
            disabled={saving === current.id} aria-pressed={mine === index}
            onClick={() => void vote(current, index)}
            className={portal
              ? "min-h-12 w-full rounded-xl border border-[#8babc0] bg-[#203a50] px-4 py-3 text-left text-sm font-medium leading-6 text-[#fffaf0] transition hover:border-[#f3d999] hover:bg-[#2c4a63] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a1] disabled:opacity-60 " + (mine === index ? "ring-2 ring-[#f7e3a6] border-[#f7e3a6] bg-[#2c4a63] " : "")
              : "min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground hover:border-primary " + (mine === index ? "ring-2 ring-primary " : "")}>
            <span className="flex items-center justify-between gap-3">
              <span>{mine === index ? "✓ " : ""}{label}</span>
              {typeof mine === "number" && <span className={portal ? "shrink-0 text-[#f2e6b7]" : "shrink-0 text-primary"}>
                {percentage(totals[index] ?? 0, total)}%</span>}
            </span>
          </button>)}
        </div>
        <p className={portal ? "mt-4 text-xs leading-5 text-[#dbe1ff]" : "mt-4 text-xs leading-5 text-muted-foreground"}>
          {userId ? (typeof mine === "number" ? "Resposta salva. Você pode escolher outra alternativa." : "Selecione uma alternativa para enviar sua resposta.")
            : "Para registrar sua resposta, você precisará entrar ou criar sua conta."}
        </p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" disabled={step === 0} onClick={() => setStep(value => Math.max(value - 1, 0))}
            className="min-h-11 rounded-full border border-current/45 px-4 py-2 text-sm font-semibold disabled:opacity-40">
            Anterior
          </button>
          <button type="button" onClick={() => step === polls.length - 1 ? setFinished(true) : setStep(value => value + 1)}
            className={portal ? "min-h-11 rounded-full bg-[#ead9a8] px-5 py-2 text-sm font-semibold text-[#182b3e]" : "min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"}>
            {step === polls.length - 1 ? "Concluir" : "Próxima"}
          </button>
        </div>
        <button type="button" onClick={() => setOpen(false)}
          className={portal ? "mx-auto mt-4 block text-xs font-semibold text-[#d8dffa] underline underline-offset-4" : "mx-auto mt-4 block text-xs text-muted-foreground underline"}>
          Fechar perguntas
        </button>
      </div>}
    </div>
  </section>;
}
