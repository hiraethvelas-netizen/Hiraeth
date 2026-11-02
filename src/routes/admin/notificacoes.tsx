import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Send, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NOTIFICATION_DESTINATIONS, notificationDate, safeNotificationHref, type HiraethNotification, type NotificationDestination } from "@/lib/notifications";

export const Route = createFileRoute("/admin/notificacoes")({
  head: () => ({ meta: [{ title: "Avisos para Clientes — Admin Hiraeth" }] }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState<NotificationDestination>("/loja");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HiraethNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error: queryError } = await (supabase as any).from("app_notifications")
        .select("id,kind,title,body,href,created_at,recipient_id")
        .eq("kind", "announcement")
        .is("recipient_id", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (queryError) throw queryError;
      setHistory((data ?? []) as HiraethNotification[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar os avisos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sendNotice(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) { toast.error("Preencha o título e o texto da mensagem."); return; }
    if (cleanTitle.length > 120 || cleanBody.length > 500) {
      toast.error("Limite: 120 caracteres no título e 500 na mensagem."); return;
    }
    if (!window.confirm("Enviar este aviso para todas as contas da Hiraeth? Ele ficará visível na área de notificações de todos os clientes.")) return;
    setSending(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Faça login como administradora para enviar.");
      const { data, error: insertError } = await (supabase as any).from("app_notifications").insert({
        recipient_id: null,
        actor_id: authData.user.id,
        kind: "announcement",
        title: cleanTitle,
        body: cleanBody,
        href: safeNotificationHref(href),
      }).select("id").single();
      if (insertError || !data?.id) throw insertError ?? new Error("O banco não confirmou o envio.");
      setTitle("");
      setBody("");
      toast.success("Aviso enviado para todas as contas da Hiraeth.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível enviar o aviso.");
    } finally {
      setSending(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-8">
    <header>
      <p className="eyebrow">Uma mensagem para cada chama</p>
      <h1 className="mt-2 font-display text-4xl text-foreground">Avisos da Hiraeth</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Envie novidades, cupons, lançamentos e recados para todas as clientes com conta na Hiraeth.
        Os avisos aparecem em <strong>Sinais da Chama</strong>, dentro do aplicativo.
        Não são e-mails nem notificações push do celular.
      </p>
    </header>

    <form onSubmit={sendNotice} className="space-y-4 rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
      <h2 className="font-display text-2xl text-foreground">Novo recado</h2>
      <label className="block text-sm text-foreground">Título
        <input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Uma surpresa está chegando..." className="mt-2 w-full rounded border border-primary/30 bg-background px-3 py-3 text-foreground" />
        <span className="mt-1 block text-right text-xs text-muted-foreground">{title.length}/120</span>
      </label>
      <label className="block text-sm text-foreground">Mensagem
        <textarea required maxLength={500} rows={5} value={body} onChange={e => setBody(e.target.value)}
          placeholder="Ex.: O Acervo está com um cupom especial. Passe na Loja para descobrir..."
          className="mt-2 w-full rounded border border-primary/30 bg-background px-3 py-3 text-foreground" />
        <span className="mt-1 block text-right text-xs text-muted-foreground">{body.length}/500</span>
      </label>
      <label className="block text-sm text-foreground">Para onde a pessoa vai ao tocar no aviso?
        <select value={href} onChange={e => setHref(e.target.value as NotificationDestination)}
          className="mt-2 w-full rounded border border-primary/30 bg-background px-3 py-3 text-foreground">
          {NOTIFICATION_DESTINATIONS.map(destination => (
            <option key={destination.value} value={destination.value}>{destination.label}</option>
          ))}
        </select>
      </label>
      <div className="rounded-lg border border-primary/15 bg-background/65 p-4">
        <p className="text-xs uppercase tracking-wider text-primary">Prévia do recado</p>
        <p className="mt-2 font-display text-xl text-foreground">{title.trim() || "Título do aviso"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{body.trim() || "O texto aparecerá aqui."}</p>
      </div>
      <button type="submit" disabled={sending} className="btn-gold inline-flex items-center gap-2 disabled:opacity-50">
        <Send size={16} aria-hidden="true" /> {sending ? "Enviando..." : "Enviar para todos"}
      </button>
    </form>

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-foreground">Recados enviados</h2>
        <button type="button" onClick={() => void load()} aria-label="Atualizar recados enviados"
          className="rounded-full border border-primary/30 p-2 text-primary"><RefreshCw size={16}/></button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p className="text-sm text-muted-foreground">Carregando os recados...</p> :
        history.length ? history.map(notice => <article key={notice.id}
          className="flex min-w-0 items-start gap-3 rounded-lg border border-primary/20 p-4">
          <Bell size={19} className="mt-1 shrink-0 text-primary" aria-hidden="true"/>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl text-foreground">{notice.title}</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{notice.body}</p>
            <p className="mt-2 text-xs text-primary">{notificationDate(notice.created_at)} · Enviado a todos</p>
          </div>
        </article>) : <p className="py-5 text-sm text-muted-foreground">Nenhum recado enviado ainda.</p>}
    </section>
  </div>;
}
