import { json, errorResponse, env, mercadoPagoRequest, serviceClient } from "../_shared/commerce-api.ts";

/** Verify Mercado Pago's x-signature HMAC before touching payments or stock. */
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

Deno.serve(async req => {
  if (req.method !== "POST") return json({ error: "Método não permitido." },405);
  try {
    const url = new URL(req.url);
    const signature = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const data = await req.json().catch(() => ({}));
    if (data.type !== "payment" && data.action?.startsWith("payment.") !== true)
      return json({ received: true });
    const paymentId = String(url.searchParams.get("data.id") ?? data.data?.id ?? "");
    if (!await validMercadoPagoSignature(
      signature, requestId, paymentId, env("MERCADO_PAGO_WEBHOOK_SECRET"),
    )) return json({ error: "Assinatura inválida." },401);

    // A webhook body is NOT proof of payment. Read its actual state from MP.
    const payment = await mercadoPagoRequest("/v1/payments/"+paymentId, "GET");
    if (String(payment.id) !== paymentId ||
        !/^[\da-f]{8}-[\da-f-]{27,36}$/i.test(String(payment.external_reference??"")))
      return json({ error:"Referência de pagamento inválida." },400);
    const checkoutId = String(payment.external_reference);
    const db = serviceClient();
    const { data: checkout, error } = await db.from("commerce_checkouts")
      .select("id,status,mp_payment_id,total").eq("id",checkoutId).maybeSingle();
    if (error || !checkout) return json({ error:"Checkout não encontrado." },404);
    if (checkout.mp_payment_id && checkout.mp_payment_id !== paymentId)
      return json({ error:"Pagamento não pertence ao checkout." },409);
    const providerStatus = String(payment.status ?? "");
    if (providerStatus === "approved") {
      const { data: outcome, error: confirmationError } = await db.rpc(
        "confirm_paid_commerce_checkout", {
          p_checkout_id:checkoutId,
          p_payment_id:paymentId,
          p_amount:Number(payment.transaction_amount),
          p_method:String(payment.payment_method_id ?? "mercadopago"),
        },
      );
      if (confirmationError) throw new Error("Não foi possível conciliar o pagamento aprovado.");
      return json({ received:true,settlement:outcome?.status });
    }

    // Never decrement stock or mark orders paid for "pending", "in_process",
    // "rejected", "refunded" or "charged_back" notifications.
    const status = ["pending","in_process","authorized"].includes(providerStatus)
      ? "pending" : ["rejected","cancelled"].includes(providerStatus)
      ? "rejected" : "paid_attention";
    if (!["paid","paid_attention"].includes(checkout.status)) {
      await db.from("commerce_checkouts").update({
        status, mp_payment_id:paymentId,
        last_error:["refunded","charged_back"].includes(providerStatus)
          ? "Provider reversal: manual financial review required" : null,
        updated_at:new Date().toISOString(),
      }).eq("id",checkoutId);
    } else if (["refunded","charged_back"].includes(providerStatus)) {
      // Inventory restocking and refund handling require reconciliation,
      // not a blind decrement/increment on every repeated webhook.
      await db.from("commerce_checkouts").update({
        status:"paid_attention",
        last_error:"Provider reversal: manual financial review required",
        updated_at:new Date().toISOString(),
      }).eq("id",checkoutId);
    }
    return json({ received:true });
  } catch (error) {
    return errorResponse(error, 500);
  }
});
