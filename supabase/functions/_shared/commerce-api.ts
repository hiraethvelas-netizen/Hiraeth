import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("COMMERCE_ALLOWED_ORIGIN") || "https://hiraeth-oficial.lovable.app",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Vary": "Origin",
};

export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function errorResponse(reason: unknown, status = 400) {
  const message = reason instanceof Error ? reason.message : "Não foi possível continuar.";
  // Never expose payment provider tokens, SQL internals or raw stack traces.
  return json({ error: message.slice(0, 200) }, status);
}

export function env(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error("Configuração comercial pendente: " + name);
  return value;
}

export function isCommerceEnabled() {
  return Deno.env.get("HIRAETH_COMMERCE_ENABLED") === "true" &&
    Boolean(Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")) &&
    Boolean(Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")) &&
    Boolean(Deno.env.get("MELHOR_ENVIO_TOKEN")) &&
    Boolean(Deno.env.get("MELHOR_ENVIO_ORIGIN_POSTAL_CODE"));
}

export function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signedInUser(req: Request) {
  const bearer = req.headers.get("authorization") || "";
  if (!/^Bearer .{20,}$/i.test(bearer)) throw new Error("Entre na sua conta para continuar.");
  const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user?.id || !data.user.email)
    throw new Error("Sua sessão expirou. Entre novamente.");
  return data.user;
}

export async function requireAdmin(req: Request) {
  const user = await signedInUser(req);
  const { data, error } = await serviceClient().rpc("has_role", {
    _user_id: user.id, _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso reservado à administração.");
  return user;
}

export async function mercadoPagoRequest(path: string, method: string, body?: unknown, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    Authorization: "Bearer " + env("MERCADO_PAGO_ACCESS_TOKEN"),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  const res = await fetch("https://api.mercadopago.com" + path, {
    method, headers, ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  const response = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("O Mercado Pago não conseguiu processar a operação. Tente novamente.");
  return response;
}

export function postalCode(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g,"");
  if (!/^\d{8}$/.test(digits)) throw new Error("Informe um CEP de oito dígitos.");
  return digits;
}

export type Recipient = {
  name: string;
  document: string;
  email: string;
  phone: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export function validateRecipient(input: any, email: string): Recipient {
  if (!input || typeof input !== "object") throw new Error("Preencha os dados de entrega.");
  const str = (name: string, max = 120) => String(input[name] ?? "").trim().slice(0,max);
  const name = str("name"), document = str("document").replace(/\D/g,"");
  const state = str("state").toUpperCase();
  const number = str("number"), street = str("street"), district = str("district"), city = str("city");
  if (name.length < 3 || street.length < 3 || !number || !district || !city || !/^[A-Z]{2}$/.test(state))
    throw new Error("Confira nome, rua, número, bairro, cidade e UF da entrega.");
  if (![11,14].includes(document.length)) throw new Error("Informe um CPF ou CNPJ válido.");
  return {
    name, document, email, phone: str("phone").replace(/\D/g,""),
    postal_code: postalCode(input.postal_code), street, number,
    complement: str("complement"), district, city, state,
  };
}

export type FreightQuote = {
  id: number;
  company: string;
  name: string;
  price: number;
  delivery_time: number | null;
};
export function betterShippingUrl() {
  return Deno.env.get("MELHOR_ENVIO_ENV") === "production"
    ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";
}
export function melhorEnvioHeaders() {
  return {
    Authorization: "Bearer " + env("MELHOR_ENVIO_TOKEN"),
    "User-Agent": env("MELHOR_ENVIO_USER_AGENT"),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** The quote is obtained again during checkout creation. Browser prices are ignored. */
export async function freightQuotes(
  destination: string,
  items: Array<{ weightGrams: number; quantity: number; price: number }>,
): Promise<FreightQuote[]> {
  const width = Number(env("HIRAETH_PACKAGE_WIDTH_CM"));
  const length = Number(env("HIRAETH_PACKAGE_LENGTH_CM"));
  const height = Number(env("HIRAETH_PACKAGE_HEIGHT_CM"));
  if (![width,length,height].every(n=>Number.isFinite(n)&&n>0))
    throw new Error("Configure as dimensões reais da embalagem na administração.");
  // Using one package means all packed candles share measured box dimensions.
  // Merchant must configure adequate dimensions for the maximum order size.
  const weightKg = items.reduce((sum,i)=>sum+i.quantity*i.weightGrams,0)/1000;
  const declaredValue = items.reduce((sum,i)=>sum+i.price*i.quantity,0);
  const payload = {
    from: { postal_code: postalCode(env("MELHOR_ENVIO_ORIGIN_POSTAL_CODE")) },
    to: { postal_code: postalCode(destination) },
    package: {
      width, height, length,
      weight: Math.round(Math.max(weightKg,0.1)*1000)/1000,
      insurance_value: Math.round(declaredValue*100)/100,
    },
    options: { receipt: false, own_hand: false },
  };
  const response = await fetch(betterShippingUrl()+"/api/v2/me/shipment/calculate",{
    method:"POST",headers:melhorEnvioHeaders(),body:JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Não foi possível calcular o frete. Confira o CEP.");
  const raw: unknown=await response.json();
  if (!Array.isArray(raw)) throw new Error("Cotação de frete indisponível.");
  return raw.flatMap((row:any) => {
    const amount=Number(row?.custom_price ?? row?.price);
    if (row?.error || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(Number(row?.id))) return [];
    return [{
      id:Number(row.id),
      company:String(row.company?.name ?? "Transportadora").slice(0,80),
      name:String(row.name ?? "Entrega").slice(0,80),
      price:Math.round(amount*100)/100,
      delivery_time:Number.isFinite(Number(row.delivery_time))?Number(row.delivery_time):null,
    }];
  });
}
