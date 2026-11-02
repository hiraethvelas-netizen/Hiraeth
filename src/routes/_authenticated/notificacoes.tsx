import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Flame, Heart, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { notificationDate, safeNotificationHref, type HiraethNotification } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sinais da Chama — Hiraeth" }] }),
  component: NotificationsPage,
});

export function NotificationIcon({ kind }: { kind: HiraethNotification["kind"] }) {
  const props = { size: 21, strokeWidth: 1.7, "aria-hidden": true as const };
  if (kind === "announcement") return <Flame {...props} />;
  if (kind === "reaction") return <Heart {...props} />;
  if (kind === "comment") return <MessageCircle {...props} />;
  return <Sparkles {...props} />;
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<HiraethNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data, error: queryError } = await (supabase as any)
        .from("app_notifications")
        .select("id,kind,title,body,href,created_at,recipient_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (queryError) throw queryError;
      setNotifications((data ?? []) as HiraethNotification[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error
        ? "Não foi possível carregar os avisos. " + cause.message
        : "Não foi possível carregar as notificações. Tente novamente.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const onFocus = () => { void refresh(true); };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh(true);
    }, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return <div className="min-h-screen">
    <SiteHeader />
    <main className="min-h-[65vh] bg-[#18251d] text-[#f7efda]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-base italic tracking-wide text-[#dbc28a]">Um sinal entre histórias</p>
          <h1 className="mt-2 font-display text-4xl text-[#f7efda] sm:text-5xl">Sinais da Chama</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[#ece4d0]">
            Avisos da Hiraeth, mensagens e acontecimentos do Círculo do Fogo.
            Tudo em um só lugar, sem precisar marcar como lido.
          </p>
        </div>
        <button type="button" aria-label="Atualizar notificações" disabled={refreshing}
          onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-full border border-[#c8ac75] bg-[#273a2c] px-4 py-2 text-sm font-medium text-[#f7efda] transition-colors hover:bg-[#334b37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7efda] disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" /> Atualizar
        </button>
      </div>

      {error && <p role="alert" className="mb-5 rounded border border-[#e7bd8b] bg-[#39271e] p-3 text-sm text-[#fff0dc]">{error}</p>}
      {loading ? <p role="status" className="py-12 text-center text-[#ece4d0]">Reunindo os sinais da chama...</p> :
        notifications.length === 0 ? (
          <section className="rounded-xl border border-[#c6ae7e] bg-[#f6eed9] px-5 py-14 text-center shadow-lg">
            <Bell size={36} strokeWidth={1.2} className="mx-auto text-[#526238]" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl text-[#283c2a]">A chama está tranquila por enquanto</h2>
            <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-[#394b36]">
              Quando chegar um aviso, uma nova mensagem ou uma interação da Comunidade, ele aparecerá aqui.
            </p>
          </section>
        ) : <ol className="space-y-3" aria-label="Histórico de notificações">
          {notifications.map(notification => (
            <li key={notification.id}>
              <a href={safeNotificationHref(notification.href)}
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-[#c8af7c] bg-[#f6eed9] p-4 shadow-[0_4px_18px_rgba(0,0,0,0.16)] transition-colors hover:border-[#94713d] hover:bg-[#fff6df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9bc79] sm:gap-4 sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#9e8652] bg-[#e6d9b7] text-[#364729]" aria-hidden="true">
                  <NotificationIcon kind={notification.kind} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-display text-[1.45rem] font-semibold leading-snug text-[#273b2b]">{notification.title}</span>
                  <span className="mt-2 block whitespace-pre-wrap break-words text-base leading-relaxed text-[#354933]">{notification.body}</span>
                  <span className="mt-3 block text-sm font-medium text-[#65512f]">
                    {notification.kind === "announcement" ? "Recado da Hiraeth" : "Círculo do Fogo"}
                    {" · "}{notificationDate(notification.created_at)}
                  </span>
                </span>
                <span className="self-center text-2xl font-semibold text-[#526238]" aria-hidden="true">›</span>
              </a>
            </li>
          ))}
        </ol>}
      </div>
    </main>
    <SiteFooter />
  </div>;
}
