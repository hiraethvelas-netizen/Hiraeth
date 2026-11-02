import {
  corsHeaders, json, errorResponse, env, isCommerceEnabled,
  signedInUser, serviceClient, postalCode, validateRecipient,
  freightQuotes, mercadoPagoRequest,
} from "../_shared/commerce-api.ts";
import { validateItems, snapshotProducts, calculateCheckoutPrice } from "../_shared/commerce-pricing.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Solicitação inválida." }, 400);
  }

  if (body?.action === "config") {
    return json({
      enabled: isCommerceEnabled(),
      publicKey: isCommerceEnabled() ? env("MERCADO_PAGO_PUBLIC_KEY") : null,
      sandbox: Deno.env.get("HIRAETH_PAYMENTS_MODE") !== "production",
      shippingProvider: "Melhor Envio",
      fiscalProvider: "Focus NFe",
    });
  }

  try {
    const user = await signedInUser(req);
    if (!isCommerceEnabled()) return json({
      error: "O checkout está em configuração. Nenhuma cobrança foi iniciada.",
      code: "COMMERCE_NOT_ENABLED",
    }, 503);
    const db = serviceClient();

    if (body.action === "status") {
      const id = String(body.checkoutId ?? "");
      const { data, error } = await db.from("commerce_checkouts")
        .select("id,status,total,shipping,discount,order_id,mp_payment_id,pix_qr_code,pix_qr_code_base64,expires_at,last_error")
        .eq("id", id).eq("user_id", user.id).maybeSingle();
      if (error || !data) return json({ error: "Pagamento não encontrado." }, 404);
      return json({ checkout: data });
    }

    if (!["quote","init","pay"].includes(body.action)) {
      return json({ error: "Ação desconhecida." }, 400);
    }

    if (body.action === "pay") {
      const id = String(body.checkoutId ?? "");
      const { data: session, error } = await db.from("commerce_checkouts")
        .select("*").eq("id",id).eq("user_id",user.id).maybeSingle();
      if (error || !session) return json({error:"Sessão de compra não encontrada."},404);
      if (session.status === "paid" || session.status === "paid_attention")
        return json({checkoutId:id,status:session.status,orderId:session.order_id});
      if (session.mp_payment_id) {
        return json({checkoutId:id,status:session.status,qrCode:session.pix_qr_code,
          qrCodeBase64:session.pix_qr_code_base64});
      }
      if (session.status !== "awaiting_payment" || Date.now() > new Date(session.expires_at).getTime())
        return json({error:"Essa tentativa expirou. Revise o carrinho e recomece o pagamento."},409);
      if (body.method !== "pix" && body.method !== "card")
        return json({error:"Selecione Pix ou cartão."},400);

      // The client cannot set transaction_amount, merchant token or order id.
      // Card numbers, CVV and expiry never enter this endpoint. Only the
      // one-time Mercado Pago token is passed directly to its payment API.
      const payer = { email: user.email,
        identification: { type: session.recipient.document.length === 14 ? "CNPJ" : "CPF",
          number: session.recipient.document } };
      const request: Record<string, unknown> = {
        transaction_amount: Number(session.total),
        description: "Pedido Hiraeth",
        external_reference: id,
        currency_id: "BRL",
        payment_method_id: body.method === "pix" ? "pix" : String(body.paymentData?.payment_method_id ?? ""),
        payer,
        notification_url: env("SUPABASE_URL").replace(/\/$/, "")+"/functions/v1/commerce-webhook",
      };

      if (body.method === "card") {
        const data = body.paymentData ?? {};
        if (typeof data.token !== "string" || !/^[\w-]{10,200}$/.test(data.token))
          return json({error:"Preencha o cartão na área segura do Mercado Pago."},400);
        if (!Number.isSafeInteger(Number(data.installments)) || Number(data.installments) < 1 || Number(data.installments) > 24)
          return json({error:"Selecione o parcelamento."},400);
        if (!/^[\w-]{2,60}$/.test(String(data.payment_method_id ?? "")))
          return json({error:"Forma de pagamento inválida."},400);
        request.token = data.token;
        request.installments = Number(data.installments);
        if (data.issuer_id && /^\d+$/.test(String(data.issuer_id))) request.issuer_id = Number(data.issuer_id);
      }

      // A payment request key stays stable per checkout: safe retries never
      // issue two charges because of a double tap or a network timeout.
      const result = await mercadoPagoRequest("/v1/payments", "POST", request, session.payment_request_key);
      const paymentId = String(result.id ?? "");
      if (!/^\d+$/.test(paymentId)) throw new Error("Mercado Pago não confirmou a criação do pagamento.");

      const updates: Record<string, unknown> = {
        mp_payment_id: paymentId,
        payment_method: body.method,
        status: result.status === "approved" ? "processing"
          : result.status === "rejected" ? "rejected" : "pending",
        updated_at: new Date().toISOString(),
      };
      if (body.method === "pix") {
        updates.pix_qr_code = result.point_of_interaction?.transaction_data?.qr_code ?? null;
        updates.pix_qr_code_base64 = result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
      }
      const { data: updated, error: updateError } = await db.from("commerce_checkouts")
        .update(updates).eq("id", id).eq("user_id", user.id)
        .eq("status", "awaiting_payment")
        .select("id,status");
      if (updateError) throw new Error("Não foi possível registrar o retorno do Mercado Pago.");
      // A webhook may approve and finalize the payment before the REST
      // response returns. Never overwrite a paid checkout with "pending".
      if (!updated?.length) {
        const { data: current } = await db.from("commerce_checkouts")
          .select("status,order_id,mp_payment_id,pix_qr_code,pix_qr_code_base64")
          .eq("id", id).eq("user_id", user.id).maybeSingle();
        if (!current || (current.mp_payment_id && current.mp_payment_id !== paymentId))
          throw new Error("O pagamento precisa de conciliação. Consulte Meus pedidos.");
        if (current.status === "paid" || current.status === "paid_attention")
          return json({ checkoutId: id, paymentId, status: current.status, orderId: current.order_id,
            qrCode: current.pix_qr_code, qrCodeBase64: current.pix_qr_code_base64 });
      }
      let status = updates.status;
      let orderId: string | null = null;
      if (result.status === "approved") {
        const { data: confirmed, error: rpcError } = await db.rpc("confirm_paid_commerce_checkout", {
          p_checkout_id: id, p_payment_id: paymentId,
          p_amount: Number(result.transaction_amount), p_method: body.method,
        });
        if (rpcError) throw new Error("Pagamento aprovado e em conciliação. Consulte Meus pedidos.");
        status = confirmed.status;
        orderId = confirmed.order_id ?? null;
      }
      return json({
        checkoutId: id, paymentId, status, orderId,
        qrCode: updates.pix_qr_code ?? null,
        qrCodeBase64: updates.pix_qr_code_base64 ?? null,
      });
    }

    const cartItems = validateItems(body.items);
    const ids = [...new Set(cartItems.map(item => item.productId))];
    const { data: products, error: productsError } = await db.from("products")
      .select("id,name,status,product_type,category_id,price,sale_price,variants,stock,weight_grams")
      .in("id", ids);
    if (productsError || !products || products.length !== ids.length)
      throw new Error("Não foi possível conferir o estoque. Revise sua sacola.");
    const weights = Number(Deno.env.get("HIRAETH_DEFAULT_PRODUCT_WEIGHT_GRAMS") || "0");
    const items = snapshotProducts(cartItems, products, weights);
    const destination = postalCode(body.action === "quote" ? body.postalCode : body.recipient?.postal_code);
    const { quotes, parcel } = await freightQuotes(destination, items);
    if (body.action === "quote") return json({ quotes });
    if (!quotes.length) throw new Error("Não há frete disponível para esse CEP.");
    const selectedQuote = quotes.find(quote => quote.id === Number(body.freightServiceId));
    if (!selectedQuote) throw new Error("Selecione uma das opções de entrega disponíveis.");
    // Preserve parcel dimensions and billed weight for consistent label creation.
    const freight = { ...selectedQuote, package: parcel };

    const recipient = validateRecipient(body.recipient, user.email);
    const [{ data: promos, error: promoError }, { data: categories, error: categoryError }] =
      await Promise.all([
        db.from("promotions").select("*").eq("active", true).eq("visible", true),
        db.from("categories").select("id,parent_id"),
      ]);
    if (promoError || categoryError) throw new Error("Não foi possível conferir os cupons.");
    const summary = calculateCheckoutPrice(items, promos ?? [], categories ?? [],
      String(body.couponCode ?? ""), freight.price);

    // Preserve server-calculated prices, the chosen carrier and delivery details
    // for webhook confirmation. Never store card data in this table.
    const payload = {
      user_id: user.id, email: user.email, recipient,
      items: items.map(item => ({
        productId: item.productId, name: item.name, quantity: item.quantity,
        price: item.price, variantKey: item.variantKey,
        stockVariantKey: item.stockVariantKey,
        weightGrams: item.weightGrams,
        shippingSize: item.shippingSize ?? null,
        variantDetails: item.variantDetails,
      })),
      freight, coupon_code: summary.coupon_code,
      promotion_summary: {
        applied: summary.applied, gifts: summary.gifts,
        freeShipping: summary.freeShipping,
      },
      subtotal:summary.subtotal, discount:summary.discount,
      shipping:summary.shipping,total:summary.total,
      status:"awaiting_payment",
    };
    const { data: checkout, error: createError } = await db.from("commerce_checkouts")
      .insert(payload).select("id,total,shipping,subtotal,discount,expires_at").single();
    if (createError || !checkout) throw new Error("Não foi possível iniciar o checkout.");
    return json({
      checkout, publicKey: env("MERCADO_PAGO_PUBLIC_KEY"),
      sandbox: Deno.env.get("HIRAETH_PAYMENTS_MODE") !== "production",
      freight,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const status = /sessão|Entre na sua conta/i.test(message) ? 401 : 400;
    return errorResponse(cause, status);
  }
});
