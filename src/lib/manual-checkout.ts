import type { CartItem } from "@/lib/cart";

/**
 * An inquiry, NOT an order. No inventory is reserved and no price is quoted.
 * Only the public catalog selection goes into the WhatsApp link.
 */
export function buildManualInquiryLink(
  phone: string,
  items: ReadonlyArray<Pick<CartItem, "name" | "quantity" | "variantDetails">>,
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!/^55\d{10,11}$/.test(digits) || items.length === 0) return null;

  const clean = (value: string) => value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 100);
  const lines = items.slice(0, 20).filter(item => Number.isSafeInteger(item.quantity) && item.quantity > 0)
    .map(item => {
      const details = item.variantDetails;
      const fields: string[] = [];
      for (const [key, label] of [["size", "Tamanho"], ["house", "Casa"]] as const) {
        const value = details?.[key];
        if (typeof value === "string" && value.trim()) fields.push(label + ": " + clean(value));
      }
      const options = details?.["options"];
      if (options && typeof options === "object" && !Array.isArray(options)) {
        for (const [key, value] of Object.entries(options)) {
          if (typeof value === "string" && value.trim()) fields.push(clean(key) + ": " + clean(value));
        }
      }
      const variant = fields.length ? " (" + fields.slice(0, 4).join(", ") + ")" : "";
      return "- " + item.quantity + "x " + clean(item.name) + variant;
    });

  if (!lines.length) return null;
  if (items.length > 20) lines.push("- E mais itens na sacola; posso enviar os detalhes pelo atendimento.");

  const message = [
    "Olá, Hiraeth! Gostaria de consultar a disponibilidade destas velas:",
    ...lines,
    "",
    "Este contato é apenas uma consulta, não um pedido confirmado.",
    "Por favor, confirme disponibilidade, valores, descontos e frete antes de qualquer pagamento.",
  ].join("\n");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}
