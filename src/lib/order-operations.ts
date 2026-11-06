import type { Json } from "@/integrations/supabase/types";

/** Human-readable variant snapshot from the checkout server, not mutable product data. */
export function orderItemVariantLabel(details: Json | null | undefined): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const raw = details as Record<string, unknown>;
  const options = raw["options"] && typeof raw["options"] === "object" && !Array.isArray(raw["options"])
    ? raw["options"] as Record<string, unknown> : {};
  const string = (value: unknown) => typeof value === "string" ? value.trim().slice(0,120) : "";
  const findOption = (names: string[]) => {
    const match = Object.entries(options).find(([name]) =>
      names.includes(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()));
    return string(match?.[1]);
  };

  const size = string(raw["size"]) || findOption(["tamanho","peso","size"]) ||
    (/\b(100\s*g|250\s*g|pequena|pequeno|grande)\b/i.test(string(raw["label"]))
      ? string(raw["label"]) : "");
  const house = string(raw["house"]) || findOption(["casa","house","casa escolhida"]);
  const entries = [
    size ? `Tamanho: ${size}` : "",
    house ? `Casa: ${house}` : "",
  ].filter(Boolean);
  for (const [key,value] of Object.entries(options)) {
    const normalized=key.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    if (["tamanho","peso","size","casa","house","casa escolhida"].includes(normalized)) continue;
    const label=string(value);
    if (label) entries.push(`${key.slice(0,60)}: ${label}`);
  }
  const label=string(raw["label"]);
  if (label && label !== size && label !== house && !entries.some(entry=>entry.endsWith(label)))
    entries.push(`Opção: ${label}`);
  if (!entries.length && string(raw["variantKey"]))
    entries.push(`Variação selecionada: ${string(raw["variantKey"])}`);
  return entries.join(" · ");
}

export function orderLifecycleLabel(status: string): string {
  const labels:Record<string,string>={
    pending:"Aguardando pagamento",paid:"Pagamento aprovado",
    preparing:"Em preparação",shipped:"Enviado",delivered:"Entregue",
    cancelled:"Cancelado",refunded:"Reembolsado",
  };
  return labels[status] ?? status;
}

export type RefundReview = {
  id:string;order_id:string;kind:"cancellation"|"refund";status:string;
  reason:string;created_at:string;updated_at:string;
};
export function canRequestFinancialReview(orderStatus:string,paymentStatus:string|null):boolean {
  return paymentStatus==="approved" && ["paid","preparing","shipped","delivered"].includes(orderStatus);
}
export function financialReviewLabel(kind:string):string {
  return kind==="cancellation"?"Cancelamento e reembolso":"Análise de reembolso";
}
