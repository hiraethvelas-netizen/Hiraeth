import type { CartItem } from "@/lib/cart";
import type { CheckoutRecipientFields } from "@/lib/checkout-recipient";
import { isValidBrazilianPhone } from "../../supabase/functions/_shared/commerce-document";

export type ManualRecipient = Omit<CheckoutRecipientFields, "document">;
export type ManualPaymentChoice = "pix" | "credito" | "debito";

export type ManualOrderForm = {
  recipient: ManualRecipient;
  payment: ManualPaymentChoice;
  gift: boolean;
  packingVideo: boolean;
  note: string;
  coupon: string;
};

type OrderSelection = ReadonlyArray<Pick<CartItem, "name" | "quantity" | "variantDetails">>;

const removeControls = (value: string, limit = 120) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

const digits = (value: string) => value.replace(/\D/g, "");
const paymentName: Record<ManualPaymentChoice, string> = {
  pix: "Pix — aguardo chave ou QR Code após a confirmação do atendimento",
  credito: "Cartão de crédito — solicito link seguro do provedor",
  debito: "Cartão de débito — consultar disponibilidade de link seguro",
};

/** No CPF, email, payment data or tokens are ever included in this client-side WhatsApp draft. */
export function validateManualOrder(form: ManualOrderForm, items: OrderSelection): string | null {
  const r = form.recipient;
  if (!items.length || items.length > 18 || items.some(item =>
    !item.name.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20))
    return "Confira a sacola. Para pedidos grandes, fale diretamente com a Hiraeth.";
  if (removeControls(r.name).length < 3) return "Informe o nome completo de quem vai receber.";
  if (!isValidBrazilianPhone(r.phone)) return "Informe um telefone válido com DDD.";
  if (!/^\d{8}$/.test(digits(r.postal_code))) return "Informe um CEP válido de oito números.";
  if ([r.street, r.district, r.city].some(x => removeControls(x).length < 2) ||
      removeControls(r.number).length < 1)
    return "Preencha rua, número, bairro e cidade do endereço de entrega.";
  if (!/^[A-Z]{2}$/.test(r.state.trim().toUpperCase()))
    return "Informe a UF do estado com duas letras.";
  if (!["pix", "credito", "debito"].includes(form.payment))
    return "Escolha a forma de pagamento para consultar.";
  return null;
}

/**
 * The browser opens this only after the shopper reviews the fields and explicitly
 * agrees to share them with WhatsApp. It does not write to our database.
 */
export function manualOrderWhatsAppLink(
  businessPhone: string,
  items: OrderSelection,
  form: ManualOrderForm,
): string | null {
  if (validateManualOrder(form, items)) return null;
  const phone = digits(businessPhone);
  if (!/^55\d{10,11}$/.test(phone)) return null;
  const r = form.recipient;
  const lines = items.map(item => {
    const details = item.variantDetails ?? {};
    const selected = [details["size"], details["house"]]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map(x => removeControls(x, 60));
    const opts = details["options"];
    if (opts && typeof opts === "object" && !Array.isArray(opts)) {
      for (const [key, value] of Object.entries(opts)) {
        if (typeof value === "string" && value.trim()) {
          selected.push(removeControls(key, 30) + ": " + removeControls(value, 50));
        }
      }
    }
    return "- " + item.quantity + "× " + removeControls(item.name, 110) +
      (selected.length ? " (" + selected.slice(0, 5).join("; ") + ")" : "");
  });

  const message = [
    "Olá, Hiraeth! Gostaria de solicitar atendimento para estas velas:",
    ...lines,
    "",
    "DADOS INFORMADOS PARA ENTREGA",
    "Destinatário: " + removeControls(r.name),
    "Telefone: " + removeControls(r.phone),
    "CEP: " + digits(r.postal_code),
    "Endereço: " + removeControls(r.street) + ", " + removeControls(r.number),
    "Complemento: " + (removeControls(r.complement) || "Não informado"),
    "Bairro: " + removeControls(r.district),
    "Cidade/UF: " + removeControls(r.city) + "/" + removeControls(r.state.toUpperCase(), 2),
    "Presente: " + (form.gift ? "Sim" : "Não"),
    "Vídeo da embalagem: " + (form.packingVideo ? "Gostaria de solicitar" : "Não"),
    form.note.trim() ? "Recado: " + removeControls(form.note, 250) : "",
    form.coupon.trim() ? "Cupom informado: " + removeControls(form.coupon, 35) + " (sujeito à confirmação)" : "",
    "",
    "Forma de pagamento de preferência: " + paymentName[form.payment],
    "",
    "Sei que esta é apenas uma solicitação de atendimento: não há pedido confirmado, reserva de estoque, cobrança ou frete calculado automaticamente.",
    "Aguardo a Hiraeth confirmar disponibilidade, total, frete e pagamento antes de concluir.",
    "Não enviarei dados de cartão por mensagem.",
  ].filter(Boolean).join("\n");
  // All selected items must fit; never silently drop products from a request.
  if (message.length > 2400) return null;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}
