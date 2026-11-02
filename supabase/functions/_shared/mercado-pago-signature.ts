/**
 * Signature verification for Mercado Pago Webhooks (never trust the payload
 * or a payment status supplied by a browser).
 */
export async function validMercadoPagoSignature(
  signature: string,
  requestId: string,
  paymentId: string,
  secret: string,
): Promise<boolean> {
  const fields = Object.fromEntries(signature.split(",").map(part => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  if (!/^\d{9,16}$/.test(fields.ts ?? "") ||
      !/^[a-f0-9]{64}$/i.test(fields.v1 ?? "") ||
      !/^\d{1,30}$/.test(paymentId) ||
      !requestId || !secret) return false;
  const msg = "id:" + paymentId.toLowerCase() + ";request-id:" + requestId + ";ts:" + fields.ts + ";";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  const actual = Uint8Array.from((fields.v1 ?? "").match(/.{2}/g) ?? [], byte => parseInt(byte,16));
  if (expected.length !== actual.length) return false;
  let different = 0;
  for (let i = 0; i < expected.length; i++) different |= expected[i]! ^ actual[i]!;
  return different === 0;
}
