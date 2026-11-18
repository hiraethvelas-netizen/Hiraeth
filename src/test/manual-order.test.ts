import { describe, expect, it } from "vitest";
import { manualOrderWhatsAppLink, validateManualOrder, type ManualOrderForm } from "@/lib/manual-order";

const base: ManualOrderForm = {
  recipient: {
    name: "Pessoa de Teste", phone: "(47) 99999-1111",
    postal_code: "88330-000", street: "Rua Exemplo", number: "1",
    complement: "Apto 12", district: "Centro", city: "Balneário Camboriú", state: "SC",
  },
  payment: "pix", gift: true, packingVideo: false,
  note: "Embalagem discreta", coupon: "LIVE10",
};
const cart = [
  { name: "Casa do Leão", quantity: 1, variantDetails: {
    size: "100 g", house: "Leão", options: { Tampa: "Fênix" }, document: "12345678901" },
  },
  { name: "Chapéu Seletor", quantity: 2, variantDetails: { size: "250 g" } },
];

describe("pedido assistido no WhatsApp", () => {
  it("inclui produtos, variantes, endereço de entrega e pagamento preferido", () => {
    const href = manualOrderWhatsAppLink("5547999991234", cart, base)!;
    expect(href).toMatch(/^https:\/\/wa\.me\/5547999991234\?text=/);
    const message = decodeURIComponent(href.split("text=")[1]!);
    expect(message).toContain("1× Casa do Leão");
    expect(message).toContain("2× Chapéu Seletor");
    expect(message).toContain("Tampa: Fênix");
    expect(message).toContain("CEP: 88330000");
    expect(message).toContain("Rua Exemplo, 1");
    expect(message).toContain("Apto 12");
    expect(message).toContain("Balneário Camboriú/SC");
    expect(message).toContain("Pix");
    expect(message).toContain("LIVE10");
    expect(message).toContain("não há pedido confirmado");
    expect(message).not.toContain("12345678901");
  });

  it("informa cartão de crédito como link seguro e nunca solicita dados de cartão", () => {
    const href = manualOrderWhatsAppLink("5547999991234", cart, { ...base, payment: "credito" })!;
    const message = decodeURIComponent(href.split("text=")[1]!);
    expect(message).toContain("link seguro do provedor");
    expect(message).toContain("Não enviarei dados de cartão");
  });

  it("rejeita telefone, CEP ou dados de entrega incompletos", () => {
    expect(validateManualOrder({ ...base, recipient:{...base.recipient,postal_code:"123"} },cart)).toContain("CEP");
    expect(validateManualOrder({ ...base, recipient:{...base.recipient,phone:"9999"} },cart)).toContain("telefone");
    expect(validateManualOrder({ ...base, recipient:{...base.recipient,street:""} },cart)).toContain("rua");
    expect(manualOrderWhatsAppLink("5547999991234",cart,{...base,recipient:{...base.recipient,state:"S"}})).toBeNull();
  });

  it("não envia texto arbitrário como CPF de variante e não perde itens silenciosamente", () => {
    const overflow = Array.from({length:19},(_,i)=>({name:"Vela "+i,quantity:1}));
    expect(manualOrderWhatsAppLink("5547999991234",overflow,base)).toBeNull();
    expect(manualOrderWhatsAppLink("999",cart,base)).toBeNull();
    expect(manualOrderWhatsAppLink("5547999991234",[],base)).toBeNull();
  });
});
