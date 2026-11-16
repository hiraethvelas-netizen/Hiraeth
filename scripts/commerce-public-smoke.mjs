#!/usr/bin/env node
/**
 * Public, safe Hiraeth smoke test.
 * Read-only site GETs + unauthenticated and unsigned requests that MUST be rejected.
 * No API keys, personal data, payments, refunds, invoices or label purchases.
 */
const site = "https://hiraeth-oficial.lovable.app";
const functions = "https://c--486adfc4-5da8-41d9-8d0f-7893dfde1510-prod.lovable.cloud/functions/v1";
let failures = 0;
let checks = 0;

async function probe(title, url, config, acceptedStatuses) {
  checks++;
  try {
    const result=await fetch(url,{
      redirect:"follow",
      signal:AbortSignal.timeout(15000),
      ...config,
    });
    const accepted=acceptedStatuses.includes(result.status);
    const type=result.headers.get("content-type")??"";
    const htmlRequired=title.startsWith("Site");
    const okay=accepted && (!htmlRequired || type.includes("text/html"));
    console.log(`${okay?"PASS":"FAIL"}: ${title} — HTTP ${result.status}; type=${type.split(";")[0]}; ${accepted?"esperado":"inesperado"}`);
    if (!okay) failures++;
    // Intentionally never log response bodies or account, auth, order data.
  } catch (error) {
    failures++;
    console.error(`FAIL: ${title} — ${error instanceof Error?error.name:"Erro de rede"}`);
  }
}

await probe("Site inicial publicado",site+"/",{method:"GET"},[200]);
await probe("Site vitrine de velas",site+"/loja",{method:"GET"},[200]);
await probe("Site portal NFC Mundo da Magia",site+"/portal/o-mundo-de-magia",{method:"GET"},[200]);
await probe("Site sacola",site+"/carrinho",{method:"GET"},[200]);
await probe("Site checkout protegido (carregamento HTML)",site+"/checkout",{method:"GET"},[200]);
await probe("Site rota pública de pedidos",site+"/admin/pedidos",{method:"GET"},[200]);
await probe("Site rota de expedição",site+"/admin/expedicao",{method:"GET"},[200]);

const headers={"content-type":"application/json",Origin:site};
await probe("Checkout bloqueia diagnóstico sem login",
  functions+"/commerce-checkout",{
    method:"POST",headers,
    body:JSON.stringify({action:"health"}),
  },[400,401,403]);
await probe("Expedição bloqueia leitura sem conta administrativa",
  functions+"/commerce-fulfillment",{
    method:"POST",headers,
    body:JSON.stringify({action:"status",orderId:"00000000-0000-4000-8000-000000000000"}),
  },[400,401,403]);
await probe("Cotação de frete sem login é bloqueada",
  functions+"/commerce-checkout",{
    method:"POST",headers,
    body:JSON.stringify({action:"quote",items:[],postalCode:"00000000"}),
  },[401,403]);
await probe("Webhook de pagamento rejeita assinatura inválida",
  functions+"/commerce-webhook",{
    method:"POST",
    headers:{...headers,"x-request-id":"hiraeth-public-smoke",
      "x-signature":"ts=1700000000,v1=invalid-signature"},
    // Fake ID, impossible to authenticate; expected to stop before provider
    // query or any read/write of orders, payments and customer data.
    body:JSON.stringify({type:"payment",data:{id:"999999999999999999"}}),
  },[401]);

console.log(`Resultado: ${checks-failures}/${checks} verificações passaram. Este teste NÃO valida login, checkout pago, etiqueta, NFC ou NF-e reais.`);
if(failures)process.exitCode=1;
