/**
 * Read-only prelaunch status. Never include tokens, payloads, account
 * identifiers, customer records or provider response bodies in the UI.
 */
export type ProviderCheck = "connected" | "rejected" | "unavailable" | "not_configured";

export function summarizeProviderResponse(status: number | null): ProviderCheck {
  if (status === null || !Number.isInteger(status)) return "unavailable";
  if (status >= 200 && status < 300) return "connected";
  if (status === 401 || status === 403) return "rejected";
  return "unavailable";
}

export async function checkProviderReadOnly(
  url: string,
  headers: Record<string,string>,
  timeoutMs = 7000,
): Promise<ProviderCheck> {
  if (!headers['Authorization']?.trim()) return "not_configured";
  try {
    // No payment, shipping quote, label creation or mutation is performed.
    const result = await fetch(url,{method:"GET",headers,signal:AbortSignal.timeout(timeoutMs)});
    // Deliberately avoid parsing/logging the response; it may include PII.
    return summarizeProviderResponse(result.status);
  } catch {
    return "unavailable";
  }
}
