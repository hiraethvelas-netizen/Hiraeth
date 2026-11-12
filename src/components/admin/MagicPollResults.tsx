import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { percentage } from "@/lib/house-cup";
import { toast } from "sonner";

type Poll = { id: string; question: string; options: string[]; position: number; active: boolean };
type Row = { index: number; option: string; votes: number; percent: number };
type Result = { poll: Poll; rows: Row[]; total: number };
function csvField(value: string | number): string {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

export function MagicPollResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const { data: polls, error: readError } = await (supabase as any)
        .from("community_magic_polls").select("id,question,options,position,active").order("position");
      if (readError) throw readError;
      const rows: Result[] = await Promise.all(((polls ?? []) as Poll[]).map(async poll => {
        const { data, error: countsError } = await (supabase as any).rpc("magic_poll_results", { p_poll: poll.id });
        if (countsError) throw countsError;
        const counts = (data ?? []) as { option_index: number; vote_count: number }[];
        const total = counts.reduce((sum, value) => sum + Number(value.vote_count || 0), 0);
        return {
          poll, total,
          rows: poll.options.map((option, index) => {
            const votes = Number(counts.find(item => item.option_index === index)?.vote_count || 0);
            return { index, option, votes, percent: percentage(votes, total) };
          }),
        };
      }));
      setResults(rows);
      setError(false);
    } catch {
      setError(true);
      toast.error("Não foi possível consultar os resultados agora.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function downloadCsv() {
    const header = ["Pergunta", "Situação", "Alternativa", "Quantidade de votos", "Porcentagem", "Total de respostas"];
    const rows = results.flatMap(({ poll, rows, total }) => rows.map(row => [
      poll.question, poll.active ? "Ativa" : "Arquivada", row.option, row.votes, row.percent + "%", total,
    ]));
    const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvField).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hiraeth-respostas-mundo-da-magia.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-label="Respostas da comunidade">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pesquisa criativa</p>
        <h3 className="mt-2 font-display text-2xl text-foreground">Respostas da comunidade</h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
          Dados agregados e reais de cada pergunta para ajudar a escolher aromas, cenas e personagens. Nenhum dado pessoal é exportado.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void refresh()} disabled={busy}
          className="rounded-full border border-primary/50 px-4 py-2 text-sm text-foreground disabled:opacity-50">Atualizar resultados</button>
        <button type="button" onClick={downloadCsv} disabled={busy || results.length === 0}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Exportar CSV</button>
      </div>
    </div>
    {busy && <p role="status" className="mt-6 text-sm text-muted-foreground">Consultando votos...</p>}
    {error && <p role="alert" className="mt-6 text-sm text-destructive">Os resultados estão temporariamente indisponíveis.</p>}
    {!busy && !error && results.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</p>}
    {!busy && !error && <div className="mt-6 grid gap-5 lg:grid-cols-2">
      {results.map(({ poll, rows, total }) => {
        const maxVotes = Math.max(...rows.map(row => row.votes), 0);
        return <article key={poll.id} className="rounded-xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{poll.active ? "Publicada" : "Arquivada"} · {total} {total === 1 ? "resposta" : "respostas"}</p>
          <h4 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground">{poll.question}</h4>
          <div className="mt-4 space-y-3">
            {rows.map(row => <div key={row.index}>
              <div className="flex items-start justify-between gap-2 text-xs font-medium text-foreground">
                <span>{row.option}{total > 0 && row.votes === maxVotes ? " ✦ Mais votada" : ""}</span>
                <span className="shrink-0 tabular-nums">{row.votes} · {row.percent}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary/15">
                <div className="h-full rounded-full bg-primary" style={{ width: row.percent + "%" }} />
              </div>
            </div>)}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
