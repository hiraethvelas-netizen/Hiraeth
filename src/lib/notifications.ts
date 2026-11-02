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
