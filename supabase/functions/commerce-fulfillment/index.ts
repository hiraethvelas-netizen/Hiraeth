import {
  corsHeaders, json, errorResponse, env, requireAdmin, serviceClient,
  betterShippingUrl, melhorEnvioHeaders, mercadoPagoRequest,
} from "../_shared/commerce-api.ts";
import { isVerifiedFullRefund } from "../_shared/commerce-refund-check.ts";
import { isSandboxCheckout } from "../_shared/commerce-sandbox.ts";

async function melhorEnvio(path: string, payload: Record<string, unknown>) {
  const response=await fetch(betterShippingUrl()+path,{
    method:"POST",headers:melhorEnvioHeaders(),body:JSON.stringify(payload),
  });
  const data=await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Melhor Envio recusou a solicitação. Confira os dados da expedição e a carteira.");
  return data;
}

function fiscalBaseUrl() {
  return Deno.env.get("FOCUSNFE_MODE") === "production" &&
    Deno.env.get("FOCUSNFE_LIVE_ENABLED") === "true"
    ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

async function focusNfe(method: "GET"|"POST", path: string, body?: Record<string,unknown>) {
  const token=env("FOCUSNFE_TOKEN");
  const result=await fetch(fiscalBaseUrl()+"/v2/nfe"+path,{
    method,headers: {
      Authorization:"Basic "+btoa(token+":"),
      "Content-Type":"application/json",Accept:"application/json",
    },
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const data=await result.json().catch(() => ({}));
  if (!result.ok) throw new Error("Focus NFe não conseguiu processar a nota. Confira a configuração fiscal.");
  return data;
}

function taxTemplate(order: any, items: any[]) {
  // Templates and rules must be prepared by the issuer's accountant, rather
  // than guessing NCM, CFOP, CST/CSOSN or tax rates for candles and shirts.
  const main = JSON.parse(env("FOCUSNFE_TEMPLATE_JSON"));
  const rules = JSON.parse(env("FOCUSNFE_ITEM_RULES_JSON"));
  if (!main || typeof main !== "object" || !rules || typeof rules !== "object")
    throw new Error("Configuração fiscal inválida.");
  const recipient=order.shipping_address;
  const products=items.map((item:any,index:number)=>{
    const rule=rules[item.product_id] ?? rules["default"];
    if (!rule || !/^\d{8}$/.test(String(rule.ncm??"")) ||
        !/^\d{4}$/.test(String(rule.cfop??"")))
      throw new Error("Classificação fiscal pendente para "+item.product_name+".");
    return {
      ...rule,
      numero_item:index+1,
      codigo_produto:item.product_id,
      descricao:item.product_name,
      quantidade_comercial:Number(item.quantity),
      quantidade_tributavel:Number(item.quantity),
      valor_unitario_comercial:Number(item.unit_price),
      valor_unitario_tributavel:Number(item.unit_price),
      unidade_comercial:rule.unidade_comercial??"UN",
      unidade_tributavel:rule.unidade_tributavel??"UN",
    };
  });
  // The template contains issuer details, statutory tax codes and regimes.
  // Only verified order facts are added/overridden here.
  return {
    ...main,
    data_emissao:new Date().toISOString(),
    data_entrada_saida:new Date().toISOString(),
    tipo_documento:1, finalidade_emissao:1, consumidor_final:1,
    presenca_comprador:2,
    nome_destinatario:recipient.name,
    ...(recipient.document.length===14?{cnpj_destinatario:recipient.document}:{cpf_destinatario:recipient.document}),
    indicador_inscricao_estadual_destinatario:9,
    logradouro_destinatario:recipient.street,
    numero_destinatario:recipient.number,
    bairro_destinatario:recipient.district,
    municipio_destinatario:recipient.city,
    uf_destinatario:recipient.state,
    cep_destinatario:recipient.postal_code,
    telefone_destinatario:recipient.phone || undefined,
    valor_frete:Number(order.shipping),
    valor_desconto:Number(order.discount),
    items:products,
  };
}

Deno.serve(async (req:Request) => {
  if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Método não permitido."},405);
  try {
    await requireAdmin(req);
    const body=await req.json().catch(()=>({}));
    const orderId=String(body.orderId??"");
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId))
      return json({error:"Pedido inválido."},400);
    const db=serviceClient();
    const {data:order,error:orderError}=await db.from("orders").select("*,order_items(*)")
      .eq("id",orderId).maybeSingle();
    if (body.action==="verify_refund") {
      if (orderError || !order || !order.payment_id)
        return json({error:"Pedido ou referência de pagamento não encontrados."},404);
      // All requests here are admin-only and financial READS at the provider.
      // Never initiate a refund from the app: the merchant must do so via
      // their Mercado Pago account, with the required human confirmation.
      const {data:review}=await db.from("commerce_order_reviews")
        .select("id,status").eq("order_id",orderId)
        .in("status",["pending_review","awaiting_provider"])
        .limit(1).maybeSingle();
      if (!review)
        return json({error:"Registre uma análise financeira antes de verificar o reembolso."},409);
      const {data:checkout}=await db.from("commerce_checkouts")
        .select("id,mp_payment_id,promotion_summary,total")
        .eq("order_id",orderId).maybeSingle();
      if (!checkout || checkout.mp_payment_id!==order.payment_id ||
          isSandboxCheckout(checkout.promotion_summary))
        return json({error:"Referência de checkout não verificada. Conciliação manual necessária."},409);
      const payment=await mercadoPagoRequest("/v1/payments/"+encodeURIComponent(order.payment_id),"GET");
      if(!isVerifiedFullRefund(payment,{
        checkoutId:checkout.id,paymentId:order.payment_id,total:Number(order.total),
      })) {
        return json({status:"awaiting_provider",confirmed:false,
          message:"O Mercado Pago ainda não confirmou o reembolso total. Verifique no painel do provedor."});
      }
      const {data:confirmed,error:confirmError}=await db.rpc("confirm_verified_commerce_refund",{
        p_order_id:orderId,p_payment_id:order.payment_id,
        p_total:Number(payment.transaction_amount),p_provider_status:"refunded",
      });
      if(confirmError)throw new Error("Não foi possível conciliar o reembolso. Solicite revisão administrativa.");
      return json({status:String(confirmed),confirmed:true,
        message:"Reembolso integral confirmado pelo Mercado Pago. Revise estoque, etiqueta e nota fiscal manualmente."});
    }
    if(orderError||!order||!["paid","preparing","shipped","delivered"].includes(order.status) ||
       order.payment_status!=="approved"||!order.payment_id)
      return json({error:"Somente pedidos com pagamento aprovado podem ser expedidos."},409);
    const {data:shipment}=await db.from("commerce_shipments")
      .select("*").eq("order_id",orderId).maybeSingle();
    const {data:invoice}=await db.from("commerce_invoices")
      .select("*").eq("order_id",orderId).maybeSingle();
    if(!shipment||!invoice)return json({error:"Registros de expedição ainda não preparados."},409);
    const items=order.order_items??[];

    if(body.action==="status"){
      return json({
        shipment,invoice,
        canIssueInvoice:Boolean(Deno.env.get("FOCUSNFE_TOKEN") &&
          Deno.env.get("FOCUSNFE_TEMPLATE_JSON") &&
          Deno.env.get("FOCUSNFE_ITEM_RULES_JSON")),
        fiscalSandbox:fiscalBaseUrl().includes("homologacao"),
        shippingSandbox:betterShippingUrl().includes("sandbox"),
      });
    }

    if(body.action==="issue_invoice"){
      if (invoice.status==="authorized")return json({invoice});
      if(invoice.status==="processing"||invoice.status==="submitted")
        return json({error:"A nota já foi enviada. Use Consultar nota para verificar a autorização."},409);
      const payload=taxTemplate(order,items);
      const reference=invoice.reference;
      const response=await focusNfe("POST","?ref="+encodeURIComponent(reference),payload);
      await db.from("commerce_invoices").update({
        status:response.status==="autorizado"?"authorized":"processing",
        nfe_number:response.numero??null,access_key:response.chave_nfe??null,
        danfe_url:response.caminho_danfe??null,
        xml_url:response.caminho_xml_nota_fiscal??null,
        updated_at:new Date().toISOString(),last_error:null,
      }).eq("id",invoice.id);
      return json({status:response.status??"processing",
        fiscalSandbox:fiscalBaseUrl().includes("homologacao")});
    }

    if(body.action==="refresh_invoice"){
      if(invoice.status==="pending")return json({error:"Emita a NF-e antes de consultar."},409);
      const response=await focusNfe("GET","/"+encodeURIComponent(invoice.reference));
      const status=response.status==="autorizado"?"authorized"
        :response.status==="erro_autorizacao"?"rejected":"processing";
      await db.from("commerce_invoices").update({
        status,access_key:response.chave_nfe??invoice.access_key,
        nfe_number:response.numero??invoice.nfe_number,
        danfe_url:response.caminho_danfe??invoice.danfe_url,
        xml_url:response.caminho_xml_nota_fiscal??invoice.xml_url,
        updated_at:new Date().toISOString(),
        last_error:status==="rejected"?String(response.mensagem_sefaz??"Rejeição da SEFAZ").slice(0,350):null,
      }).eq("id",invoice.id);
      return json({status,number:response.numero,accessKey:response.chave_nfe});
    }

    if(body.action==="create_label"){
      if(invoice.status!=="authorized"||!invoice.access_key)
        return json({error:"Para uma remessa comercial, autorize primeiro a NF-e e obtenha sua chave."},409);
      if(shipment.provider_label_id)return json({shipment});
      const {data:checkout}=await db.from("commerce_checkouts")
        .select("freight,items,recipient").eq("order_id",orderId).maybeSingle();
      if(!checkout)return json({error:"Informações da cotação não encontradas."},409);
      const sender=JSON.parse(env("MELHOR_ENVIO_SENDER_JSON"));
      const recipient=checkout.recipient;
      // Use the exact parcel quoted and paid for, never mutable default
      // dimensions or a recalculated weight at label-creation time.
      const quotedPackage=checkout.freight?.package;
      const width=Number(quotedPackage?.width);
      const height=Number(quotedPackage?.height);
      const length=Number(quotedPackage?.length);
      const weight=Number(quotedPackage?.weight);
      if (![width,height,length,weight].every(n=>Number.isFinite(n)&&n>0)) {
        throw new Error("A cotação não contém as medidas e o peso do pacote. Refaça o checkout.");
      }
      const payload={
        service:Number(checkout.freight.id),
        from:sender,
        to:{
          name:recipient.name,email:recipient.email,phone:recipient.phone,
          ...(recipient.document.length===14
            ? {company_document:recipient.document}:{document:recipient.document}),
          address:recipient.street,number:recipient.number,
          complement:recipient.complement,district:recipient.district,
          city:recipient.city,state_abbr:recipient.state,
          postal_code:recipient.postal_code,country_id:"BR",
        },
        products:items.map((i:any)=>({name:i.product_name,quantity:i.quantity,
          unitary_value:Number(i.unit_price)})),
        volumes:[{height,width,length,weight}],
        options:{insurance_value:Number(order.subtotal),receipt:false,
          own_hand:false,invoice:{key:invoice.access_key}},
      };
      const response=await melhorEnvio("/api/v2/me/cart",payload);
      const providerId=String(response.id??"");
      if(!providerId)throw new Error("O Melhor Envio não confirmou a criação da etiqueta.");
      await db.from("commerce_shipments").update({
        provider_label_id:providerId,status:"awaiting_label_payment",
        updated_at:new Date().toISOString(),last_error:null,
      }).eq("id",shipment.id);
      return json({status:"awaiting_label_payment",providerLabelId:providerId});
    }

    if(body.action==="buy_label"){
      if(!shipment.provider_label_id)return json({error:"Prepare a etiqueta antes de comprar."},409);
      if(shipment.status==="label_paid"||shipment.status==="generated")return json({shipment});
      if(shipment.status!=="awaiting_label_payment")
        return json({error:"A etiqueta não está pronta para compra."},409);
      // Explicit separate admin action. Never auto-spend Melhor Envio balance.
      if(body.confirmPurchase!==true)return json({error:"Confirme a compra da etiqueta."},400);
      if(Deno.env.get("MELHOR_ENVIO_ENV")==="production" &&
         Deno.env.get("HIRAETH_ALLOW_LIVE_LABEL_PURCHASES")!=="true")
        return json({error:"Compra real de etiquetas ainda não foi autorizada."},403);
      await melhorEnvio("/api/v2/me/shipment/checkout",{orders:[shipment.provider_label_id]});
      await db.from("commerce_shipments").update({
        status:"label_paid",updated_at:new Date().toISOString(),
      }).eq("id",shipment.id);
      return json({status:"label_paid"});
    }

    if(body.action==="generate_label"){
      if(!shipment.provider_label_id || !["label_paid","generated"].includes(shipment.status))
        return json({error:"Compre a etiqueta antes de gerar o documento."},409);
      if(shipment.status!=="generated"){
        await melhorEnvio("/api/v2/me/shipment/generate",{orders:[shipment.provider_label_id]});
        await db.from("commerce_shipments").update({
          status:"generated",updated_at:new Date().toISOString(),
        }).eq("id",shipment.id);
      }
      const print=await melhorEnvio("/api/v2/me/shipment/print",{
        orders:[shipment.provider_label_id],mode:"private",
      });
      const url=typeof print?.url==="string"&&print.url.startsWith("https://")
        ?print.url:typeof print==="string"&&print.startsWith("https://")?print:null;
      await db.from("commerce_shipments").update({label_url:url,
        updated_at:new Date().toISOString()}).eq("id",shipment.id);
      return json({status:"generated",labelUrl:url,
        note:"O link privado de impressão requer uma sessão ativa do Melhor Envio."});
    }
    return json({error:"Ação desconhecida."},400);
  }catch(error){return errorResponse(error,400);}
});
