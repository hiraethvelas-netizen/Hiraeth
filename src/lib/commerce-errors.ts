/**
 * Supabase functions.invoke returns data=null on non-2xx and puts the
 * response in error.context. Recover ONLY the safe error message returned
 * by our backend, without displaying HTTP body, tokens or raw stack traces.
 */
export async function commerceFailureMessage(error: unknown, action: string): Promise<string> {
  const fallback = action === "pay"
    ? "Não foi possível confirmar o resultado do pagamento. Não tente pagar novamente antes de conferir o status."
    : "Não foi possível conectar ao checkout. Tente novamente.";
  if (!error || typeof error !== "object") return fallback;
  const context = (error as {context?:unknown}).context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const payload: unknown = await context.clone().json();
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const message = (payload as Record<string,unknown>)["error"];
        if (typeof message === "string" && message.trim().length > 0) {
          // The server uses errorResponse() to bound message length, but this
          // remains bounded locally and never surfaces arbitrary payloads.
          return message.trim().slice(0,200);
        }
      }
    } catch { /* Keep a safe fallback on HTML, empty body or network failures. */ }
    if (context.status === 401) return "Sua sessão expirou. Entre novamente na Hiraeth.";
    if (context.status === 403) return "Não foi possível autorizar esta operação no checkout.";
  }
  return fallback;
}

export function isResolvedCheckoutStatus(value: unknown): value is
  "paid" | "paid_attention" | "pending" | "processing" | "rejected" {
  return typeof value === "string" &&
    ["paid","paid_attention","pending","processing","rejected"].includes(value);
}
