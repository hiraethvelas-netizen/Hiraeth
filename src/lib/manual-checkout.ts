import type { CartItem } from "@/lib/cart";

/**
 * Manual request sent explicitly by the shopper to the merchant's WhatsApp.
 * No database write, stock reservation, order or payment is performed.
 */
export type ManualRequestDetails = {
  name: string;
  email: string;
  phone: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  isGift: boolean;
  note: string;
  paymentPreference: "pix" | "credit" | "debit";
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const clean = (value: string, max = 100) => value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

export function validateManualRequest(input: ManualRequestDetails): string | null {
  if (clean(input.name).length < 3) return "Informe o nome de quem vai receber a encomenda.";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return "Informe um e-mail válido.";
  const phone = digitsOnly(input.phone);
  if (!(phone.length === 10 || phone.length === 11 || (phone.length === 13 && phone.startsWith("55"))))
    return "Informe um telefone com DDD para contato.";
  if (digitsOnly(input.postal_code).length !== 8) return "Informe um CEP válido, com oito números.";
  if (!clean(input.street) || !clean(input.number) || !clean(input.district) || !clean(input.city))
    return "Preencha rua, número, bairro e cidade do endereço de entrega.";
  if (!/^[A-Za-z]{2}$/.test(input.state.trim())) return "Informe a UF do endereço, com duas letras.";
  if (!["pix", "credit", "debit"].includes(input.paymentPreference))
    return "Escolha como prefere pagar.";
  return null;
}

/** Only use the merchant's configured international phone, never a user-supplied URL. */
export function buildManualInquiryLink(
  merchantPhone: string,
  items: ReadonlyArray<Pick<CartItem, "name" | "quantity" | "variantDetails">>,
  details?: ManualRequestDetails,
): string | null {
  const digits = digitsOnly(merchantPhone);
  if (!/^55\d{10,11}$/.test(digits) || items.length === 0) return null;
  if (details && validateManualRequest(details)) return null;

  const lines = items.slice(0, 20).filter(item => Number.isSafeInteger(item.quantity) && item.quantity > 0)
    .map(item => {
      const variant = item.variantDetails;
      const choices: string[] = [];
      for (const [key, label] of [["size", "Tamanho"], ["house", "Casa"]] as const) {
        const value = variant?.[key];
        if (typeof value === "string" && value.trim()) choices.push(label + ": " + clean(value));
      }
      const options = variant?.["options"];
      if (options && typeof options === "object" && !Array.isArray(options)) {
        for (const [key, value] of Object.entries(options)) {
          if (typeof value === "string" && value.trim()) choices.push(clean(key) + ": " + clean(value));
        }
      }
      return "- " + item.quantity + "x " + clean(item.name) +
        (choices.length ? " (" + choices.slice(0, 4).join(", ") + ")" : "");
    });
  if (!lines.length) return null;
  if (items.length > 20) lines.push("- Outros itens na sacola: consultar no atendimento.");

  const message = [
    "Olá, Hiraeth! Gostaria de solicitar atendimento para estas velas:",
    ...lines,
    ...(details ? [
      "",
      "DADOS INFORMADOS PARA ENTREGA:",
      "Nome: " + clean(details.name, 120),
      "E-mail: " + clean(details.email, 160),
      "Telefone: " + clean(details.phone, 30),
      "CEP: " + digitsOnly(details.postal_code),
      "Endereço: " + clean(details.street, 120) + ", " + clean(details.number, 25) +
        (details.complement.trim() ? " — " + clean(details.complement, 80) : ""),
      "Bairro: " + clean(details.district, 100),
      "Cidade/UF: " + clean(details.city, 100) + "/" + clean(details.state, 2).toUpperCase(),
      "É presente: " + (details.isGift ? "Sim" : "Não"),
      ...(details.note.trim() ? ["Observações: " + clean(details.note, 350)] : []),
      "Preferência de pagamento: " +
        ({ pix: "Pix (aguardo confirmação e QR Code)", credit: "Cartão de crédito (solicito link seguro)", debit: "Débito (consultar disponibilidade)" }[details.paymentPreference]),
    ] : []),
    "",
    "Esta mensagem é uma consulta, não um pedido confirmado.",
    "NÃO uma compra confirmada: a Hiraeth ainda precisa validar a solicitação.",
    "Por favor, confirmem estoque, valores, descontos, frete e condições de pagamento.",
    "Aguarde a confirmação da Hiraeth antes de qualquer pagamento.",
    "Não enviarei dados de cartão por mensagem.",
  ].join("\n");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}
