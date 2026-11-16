/** Classifies public route entries without collecting query strings, referrers or device IDs. */
export type VisitChannel = { channel: "app" | "portal"; portalSlug: string | null };

const APP_PATHS = new Set([
  "/", "/inicio", "/loja", "/carrinho", "/checkout", "/comunidade",
  "/biblioteca", "/favoritos", "/pedidos", "/configuracoes",
  "/clube-do-livro", "/sobre", "/cuidados", "/taro-da-fenix",
]);

export function visitFromPath(path: string): VisitChannel | null {
  const clean = path.replace(/\/+$/, "") || "/";
  const portal = clean.match(/^\/portal\/([a-z0-9-]+)(?:\/inspiracoes)?$/i);
  if (portal) return { channel:"portal", portalSlug:portal[1]!.toLowerCase() };
  if (APP_PATHS.has(clean) || clean.startsWith("/produto/")) {
    return { channel:"app", portalSlug:null };
  }
  return null;
}

export function visitSessionKey(visit: VisitChannel, account: string, day: string): string {
  return ["hiraeth-insights-v1",day,account,visit.channel,visit.portalSlug ?? ""].join(":");
}
