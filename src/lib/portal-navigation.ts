/** O retorno das inspirações nunca deve repetir o vídeo de abertura NFC. */
const returnKey = (slug: string) => `hiraeth:portal:return:${slug}`;

export function portalHomeReturnUrl(slug: string): string {
  return `/portal/${encodeURIComponent(slug)}?inicio=1`;
}

export function isReturningToPortal(search: Record<string, unknown>): boolean {
  return search["inicio"] === "1";
}

/** Marcador de navegação na própria aba, independente de redirecionamentos do roteador. */
export function markPortalReturn(slug: string): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(returnKey(slug), String(Date.now())); } catch { /* armazenamento indisponível */ }
}

export function hasRecentPortalReturn(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = Number(window.sessionStorage.getItem(returnKey(slug)));
    return value > 0 && Date.now() - value < 5 * 60_000;
  } catch { return false; }
}

export function clearPortalReturn(slug: string): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(returnKey(slug)); } catch { /* armazenamento indisponível */ }
}

export function hasPortalReturnQuery(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("inicio") === "1";
}
