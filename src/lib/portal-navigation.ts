/** Um retorno vindo das inspirações abre a tela principal sem repetir o vídeo do NFC. */
export function portalHomeReturnUrl(slug: string): string {
  return `/portal/${encodeURIComponent(slug)}?inicio=1`;
}

export function isReturningToPortal(search: Record<string, unknown>): boolean {
  return search["inicio"] === "1";
}
