#!/usr/bin/env node
/**
 * Public, safe Hiraeth smoke test.
 * Read-only site GETs + unauthenticated requests that MUST be rejected.
 * No API keys, personal data, payments, refunds, invoices or label purchases.
 */
const site = "https://hiraeth-oficial.lovable.app";
const functions = "https://c--486adfc4-5da8-41d9-8d0f-7893dfde1510-prod.lovable.cloud/functions/v1";
let failures = 0;

async function probe(title, url, config, acceptedStatuses) {
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
console.log(`Resultado: ${5-failures}/5 verificações passaram. Este teste NÃO valida checkout pago, etiqueta ou NF-e reais.`);
if(failures)process.exitCode=1;
