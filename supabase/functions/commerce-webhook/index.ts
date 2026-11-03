import { json, errorResponse, env, mercadoPagoRequest, serviceClient } from "../_shared/commerce-api.ts";
import { validMercadoPagoSignature } from "../_shared/mercado-pago-signature.ts";
import { isSandboxCheckout, providerModeMatchesCheckout, paymentAmountMatchesCheckout, mayCreateRealOrder } from "../_shared/commerce-sandbox.ts";

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
      .select("id,status,mp_payment_id,total,promotion_summary").eq("id",checkoutId).maybeSingle();
    if (error || !checkout) return json({ error:"Checkout não encontrado." },404);
    if (checkout.mp_payment_id && checkout.mp_payment_id !== paymentId)
      return json({ error:"Pagamento não pertence ao checkout." },409);
    const sandboxCheckout = isSandboxCheckout(checkout.promotion_summary);
    // A test payment must never become a real order, including after mode changes.
    if (!providerModeMatchesCheckout(sandboxCheckout, payment.live_mode))
      return json({ error:"O pagamento pertence a um ambiente diferente deste checkout." },409);
    const providerStatus = String(payment.status ?? "");
    if (providerStatus === "approved") {
      if (sandboxCheckout) {
        const amountOk = paymentAmountMatchesCheckout(payment.transaction_amount, checkout.total);
        const status = amountOk ? "paid" : "paid_attention";
        if (!["paid","paid_attention"].includes(checkout.status)) {
          const { error: updateError } = await db.from("commerce_checkouts").update({
            status,mp_payment_id:paymentId,
            payment_method:String(payment.payment_method_id ?? "mercadopago"),
            paid_at:new Date().toISOString(),
            last_error:amountOk ? null : "Sandbox payment amount mismatch",
            updated_at:new Date().toISOString(),
          }).eq("id",checkoutId).in("status",["awaiting_payment","processing","pending","rejected"]);
          if (updateError) throw new Error("Não foi possível conciliar o pagamento de teste.");
        }
        return json({received:true,settlement:status,sandbox:true});
      }
      if (!mayCreateRealOrder(sandboxCheckout, payment.live_mode))
        return json({ error:"Pagamento de teste não pode criar pedido real." },409);
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
