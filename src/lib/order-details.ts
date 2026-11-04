import type { Json } from "@/integrations/supabase/types";

export type OrderDeliveryInfo = {
  name: string;
  document: string;
  buyerDocument: string;
  phone: string;
  isGift: boolean;
  addressLines: string[];
};

export type ShipmentProgress = {
  order_id: string;
  carrier_name: string | null;
  service_name: string | null;
  tracking_code: string | null;
  status: string;
  updated_at?: string | null;
};

const field = (object: Record<string, unknown>, key: string) =>
  typeof object[key] === "string" ? String(object[key]).trim() : "";

export function orderDeliveryInfo(value: Json | null | undefined): OrderDeliveryInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const street = field(item,"street");
  const number = field(item,"number");
  const complement = field(item,"complement");
  const district = field(item,"district");
  const city = field(item,"city");
  const state = field(item,"state");
  const cep = field(item,"postal_code");
  const addressLines = [
    [street,number].filter(Boolean).join(", "),
    complement,
    district,
    [city,state].filter(Boolean).join(" — "),
    cep ? `CEP ${cep}` : "",
  ].filter(Boolean);
  return {
    name: field(item,"name"),
    document: field(item,"document"),
    buyerDocument: field(item,"payer_document"),
    phone: field(item,"phone"),
    isGift: item["gift"] === true,
    addressLines,
  };
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Preparando envio",
  quoted: "Frete cotado",
  awaiting_label_payment: "Etiqueta aguardando pagamento",
  label_paid: "Etiqueta paga",
  generated: "Etiqueta gerada",
  posted: "Postado",
  delivered: "Entregue",
  failed: "Aguardando revisão da entrega",
  cancelled: "Envio cancelado",
};

/**
 * Never offer paid/refunded or guessed fulfillment states in the browser.
 * Existing DB trigger still independently verifies admin-only changes.
 */
export function nextSafeOrderStatus(
  orderStatus: string,
  paymentStatus: string | null,
  shipmentStatus: string | null | undefined,
): "shipped" | "delivered" | null {
  if (paymentStatus !== "approved") return null;
  if (orderStatus === "paid" && (shipmentStatus === "generated" || shipmentStatus === "posted")) return "shipped";
  if (orderStatus === "shipped" && shipmentStatus === "posted") return "delivered";
  return null;
}
