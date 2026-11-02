import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateShippingPackage, type ShippingPackage, type ShippingItem } from "./commerce-shipping.ts";
export { canAccessCommerce } from "./commerce-access.ts";

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
  const token=Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")?.trim() ?? "";
  const mode=Deno.env.get("HIRAETH_PAYMENTS_MODE");
  // A production credential is never accepted in the sandbox branch. To
  // enable real charges the merchant must explicitly opt in twice.
  // Mercado Pago may prefix BOTH test and production tokens with APP_USR.
  // They cannot be identified by prefix alone. Require explicit environment
  // confirmation without ever exposing an Access Token to the frontend.
  const safePaymentMode=mode==="sandbox"
    ? token.startsWith("APP_USR-") &&
      Deno.env.get("HIRAETH_TEST_CREDENTIALS_CONFIRMED")==="true"
    : mode==="production" &&
      Deno.env.get("HIRAETH_ALLOW_LIVE_CHARGES")==="true" &&
      token.startsWith("APP_USR-");
  return Deno.env.get("HIRAETH_COMMERCE_ENABLED") === "true" &&
    safePaymentMode &&
    Boolean(Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")) &&
    Boolean(Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET")) &&
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
  return { ...data.user, email: data.user.email };
}

export async function userIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await serviceClient().rpc("has_role", {
    _user_id: userId, _role: "admin",
  });
  return !error && data === true;
}

export async function requireAdmin(req: Request) {
  const user = await signedInUser(req);
  if (!await userIsAdmin(user.id)) throw new Error("Acesso reservado à administração.");
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
  items: ShippingItem[],
): Promise<{ quotes: FreightQuote[]; parcel: ShippingPackage }> {
  const mainBox = {
    width: Number(env("HIRAETH_PACKAGE_WIDTH_CM")),
    length: Number(env("HIRAETH_PACKAGE_LENGTH_CM")),
    height: Number(env("HIRAETH_PACKAGE_HEIGHT_CM")),
  };
  // The smaller box is only allowed after a real packing test, including
  // protection and the actual inner measurements. Otherwise use mainBox.
  const useSmall = Deno.env.get("HIRAETH_SMALL_BOX_FIT_CONFIRMED") === "true";
  const smallBox = useSmall ? {
    width: Number(env("HIRAETH_SMALL_PACKAGE_WIDTH_CM")),
    length: Number(env("HIRAETH_SMALL_PACKAGE_LENGTH_CM")),
    height: Number(env("HIRAETH_SMALL_PACKAGE_HEIGHT_CM")),
  } : null;
  const tare = Number(Deno.env.get("HIRAETH_PACKAGE_TARE_GRAMS") || "0");
  if (Deno.env.get("MELHOR_ENVIO_ENV") === "production" && tare <= 0) {
    throw new Error("Meça o peso da caixa e dos materiais de proteção antes de ativar fretes reais.");
  }
  const parcel = calculateShippingPackage(
    items, mainBox, smallBox,
    Number(env("HIRAETH_MAX_ITEMS_PER_PACKAGE")), tare,
  );
  const payload = {
    from: { postal_code: postalCode(env("MELHOR_ENVIO_ORIGIN_POSTAL_CODE")) },
    to: { postal_code: postalCode(destination) },
    package: parcel,
    options: { receipt: false, own_hand: false },
  };
  const response = await fetch(betterShippingUrl()+"/api/v2/me/shipment/calculate",{
    method:"POST",headers:melhorEnvioHeaders(),body:JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Não foi possível calcular o frete. Confira o CEP.");
  const raw: unknown=await response.json();
  if (!Array.isArray(raw)) throw new Error("Cotação de frete indisponível.");
  const quotes: FreightQuote[] = raw.flatMap((row:any) => {
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
  return { quotes, parcel };
}
