import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Poll = { id: string; question: string; options: string[]; active: boolean; position: number };
const INITIAL = { question: "", options: "Opção 1\nOpção 2\nOpção 3\nOpção 4", position: 50, active: true };

export function MagicPollAdmin() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [form, setForm] = useState(INITIAL);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).from("community_magic_polls").select("*").order("position");
    if (error) { toast.error("Não foi possível carregar as enquetes."); return; }
    setPolls((data ?? []) as Poll[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const options = form.options.split("\n").map(s => s.trim()).filter(Boolean);
    if (form.question.trim().length < 8 || options.length < 3 || options.length > 4) {
      toast.error("Escreva a pergunta e entre 3 e 4 opções (uma por linha)."); return;
    }
    setBusy(true);
    const values = { question: form.question.trim(), options, position: form.position, active: form.active };
    const { error } = editing
      ? await (supabase as any).from("community_magic_polls").update(values).eq("id", editing)
      : await (supabase as any).from("community_magic_polls").insert(values);
    setBusy(false);
    if (error) { toast.error(error.message || "Não foi possível salvar a enquete."); return; }
    toast.success("Enquete salva.");
    setEditing(null); setForm(INITIAL); await load();
  }

  async function toggle(poll: Poll) {
    const { error } = await (supabase as any).from("community_magic_polls").update({ active: !poll.active }).eq("id", poll.id);
    if (error) toast.error("Não foi possível alterar o status."); else await load();
  }

  return <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
    <p className="text-xs uppercase tracking-widest text-primary">Conteúdos interativos</p>
    <h3 className="mt-2 font-display text-2xl">Enquetes do Mundo da Magia</h3>
    <p className="mt-2 text-xs text-muted-foreground">Edite perguntas, organize a ordem e publique/arquive. Depois do primeiro voto, as opções ficam protegidas; para alterá-las, crie outra enquete.</p>
    <div className="mt-5 space-y-2">{polls.map(poll => <div key={poll.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
      <div><strong>{poll.question}</strong><p className="mt-1 text-xs text-muted-foreground">Ordem {poll.position} · {poll.active ? "Publicada" : "Arquivada"}</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => {setEditing(poll.id);setForm({question:poll.question,options:poll.options.join("\n"),position:poll.position,active:poll.active});}} className="rounded-full border px-3 py-2">Editar</button>
      <button type="button" onClick={() => void toggle(poll)} className="rounded-full border px-3 py-2">{poll.active ? "Arquivar" : "Publicar"}</button></div>
    </div>)}</div>
    <form onSubmit={save} className="mt-5 space-y-3 border-t pt-4">
      <h4 className="font-display text-xl">{editing ? "Editar pergunta" : "Criar pergunta"}</h4>
      <label className="block text-sm">Pergunta<input required maxLength={220} className="mt-1 w-full rounded border bg-background px-3 py-2" value={form.question} onChange={e=>setForm({...form,question:e.target.value})}/></label>
      <label className="block text-sm">Opções (3–4, uma por linha)<textarea className="mt-1 w-full rounded border bg-background px-3 py-2" rows={4} value={form.options} onChange={e=>setForm({...form,options:e.target.value})}/></label>
      <label className="block text-sm">Posição<input type="number" className="mt-1 block w-28 rounded border bg-background px-3 py-2" value={form.position} onChange={e=>setForm({...form,position:Number(e.target.value)})}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Publicada</label>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="btn-gold">{busy ? "Salvando..." : "Salvar enquete"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm(INITIAL);}} className="rounded-full border px-4 py-2 text-sm">Cancelar edição</button>}</div>
    </form>
  </section>;
}
