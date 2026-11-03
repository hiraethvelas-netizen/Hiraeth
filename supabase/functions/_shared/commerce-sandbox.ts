/**
 * Payment environment is recorded on the server-created checkout and
 * verified against the provider's own live_mode before changing any status.
 * Never trust a field from the browser to declare a sandbox payment.
 */
export function isSandboxCheckout(summary: unknown): boolean {
  return !!summary && typeof summary === "object" &&
    !Array.isArray(summary) && (summary as Record<string, unknown>).sandbox === true;
}

export function providerModeMatchesCheckout(sandbox: boolean, liveMode: unknown): boolean {
  // Fail closed if the Mercado Pago response omits live_mode.
  return sandbox ? liveMode === false : liveMode === true;
}

/** A sandbox payment must never invoke the real order / stock RPC. */
export function mayCreateRealOrder(sandbox: boolean, liveMode: unknown): boolean {
  return !sandbox && providerModeMatchesCheckout(false, liveMode);
}
