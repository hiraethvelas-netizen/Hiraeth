export const NOTIFICATION_DESTINATIONS = [
  { value: "/loja", label: "Acervo Hiraeth / Loja" },
  { value: "/comunidade", label: "Círculo do Fogo" },
  { value: "/comunidade?tab=chat", label: "Chat da Comunidade" },
  { value: "/comunidade?tab=feed", label: "Publicações da Comunidade" },
  { value: "/clube-do-livro", label: "Clube do Livro" },
  { value: "/inicio", label: "Página inicial" },
] as const;

export type NotificationDestination = typeof NOTIFICATION_DESTINATIONS[number]["value"];
export type NotificationKind = "announcement" | "reaction" | "comment" | "message";

export type HiraethNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  created_at: string;
  recipient_id?: string | null;
};

export function safeNotificationHref(href: unknown): NotificationDestination {
  const match = NOTIFICATION_DESTINATIONS.find(dest => dest.value === href);
  return match?.value ?? "/inicio";
}

export function notificationDate(timestamp: string): string {
  const time = new Date(timestamp);
  if (Number.isNaN(time.getTime())) return "";
  return time.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * The gold bell dot means "a notification arrived since this account last
 * opened Sinais da Chama". This does NOT flag individual messages read/unread.
 * The saved timestamp is private to this browser and scoped to the signed-in
 * account so switching between admin/customer cannot share the indicator.
 */
export const NOTIFICATIONS_VIEWED_EVENT = "hiraeth:notifications-viewed";
const viewedKey = (userId: string) => "hiraeth:notifications-last-opened:v1:" + userId;

export function getNotificationsViewedAt(userId: string): number {
  if (!userId || typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(viewedKey(userId)) ?? "0");
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function markNotificationsViewed(userId: string, now = Date.now()): void {
  if (!userId || typeof window === "undefined") return;
  const lastViewed = Math.max(getNotificationsViewedAt(userId), now);
  try {
    window.localStorage.setItem(viewedKey(userId), String(lastViewed));
  } catch {
    // Browser storage may be disabled; still clear the indicator for this tab.
  }
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_VIEWED_EVENT, {
    detail: { userId, lastViewed },
  }));
}

export function hasNotificationsSince(
  items: Array<{ created_at: string }> | null | undefined,
  lastViewedAt: number,
): boolean {
  return (items ?? []).some(item => {
    const date = Date.parse(item.created_at);
    return Number.isFinite(date) && date > lastViewedAt;
  });
}
