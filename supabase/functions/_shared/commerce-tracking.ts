/**
 * Minimal read-only projection of Melhor Envio tracking results.
 * Never copy arbitrary provider JSON (may contain recipient PII) to the client.
 * Always match the provider label ID before trusting a result.
 */
export type CarrierTracking = {
  found: boolean;
  status: string | null;
  trackingCode: string | null;
};

type Rec = Record<string, unknown>;
function record(value: unknown): Rec | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Rec : null;
}
function matching(value: unknown, labelId: string): Rec | null {
  const data = record(value);
  if (!data) return null;
  // Provider may return a dictionary keyed by label ID or an array of orders.
  const direct = record(data[labelId]);
  if (direct) return direct;
  const id = data['id'] ?? data['order_id'] ?? data['orderId'];
  if (typeof id === "string" && id === labelId) return data;
  for (const candidate of [data['data'], data['orders'], data['results']]) {
    if (Array.isArray(candidate)) {
      const found = candidate.map(v => matching(v, labelId)).find(Boolean);
      if (found) return found;
    } else {
      const found = matching(candidate, labelId);
      if (found) return found;
    }
  }
  return null;
}

export function summarizeCarrierTracking(payload: unknown, labelId: string): CarrierTracking {
  if (!labelId || labelId.length > 128) return { found: false, status: null, trackingCode: null };
  const root = Array.isArray(payload)
    ? payload.map(row => matching(row, labelId)).find(Boolean) ?? null
    : matching(payload, labelId);
  if (!root) return { found: false, status: null, trackingCode: null };
  const rawStatus = root['status'];
  const rawCode = root['tracking'] ?? root['tracking_code'] ?? root['trackingCode'];
  const status = typeof rawStatus === "string" && /^[\p{L}\p{N} _.-]{1,60}$/u.test(rawStatus)
    ? rawStatus : null;
  const trackingCode = typeof rawCode === "string" && /^[a-zA-Z0-9_.-]{3,80}$/.test(rawCode)
    ? rawCode : null;
  return { found: true, status, trackingCode };
}
