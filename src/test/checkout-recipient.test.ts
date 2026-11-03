import { describe, expect, it } from "vitest";
import {
  checkoutRecipientFromMetadata, checkoutMetadataFromRecipient,
  emptyCheckoutRecipient,
} from "@/lib/checkout-recipient";
import { payerDocumentForPayment } from "../../supabase/functions/_shared/checkout-identification";

describe("checkout: dados de cadastro e entrega para presente", () => {
  it("preenche nome, documento, contato e endereço da conta autenticada", () => {
    expect(checkoutRecipientFromMetadata({
      display_name: "Mariana Silva",
      phone: "(47) 99999-9999",
      document: "123.456.789-01",
      address: {
        cep: "88330-000", street: "Rua Exemplo", number: "615",
        complement: "Ap 2", neighborhood: "Centro",
        city: "Balneário Camboriú", state: "sc",
      },
    })).toEqual({
      name:"Mariana Silva", phone:"(47) 99999-9999",
      document:"12345678901", postal_code:"88330-000",
      street:"Rua Exemplo", number:"615", complement:"Ap 2",
      district:"Centro", city:"Balneário Camboriú", state:"SC",
    });
  });

  it("não inventa dados quando a conta não tem CPF, telefone ou endereço", () => {
    expect(checkoutRecipientFromMetadata({ display_name: "Cliente" })).toEqual({
      ...emptyCheckoutRecipient, name:"Cliente",
    });
    expect(checkoutRecipientFromMetadata(null)).toEqual(emptyCheckoutRecipient);
  });

  it("suporta cadastro legado com campo address textual ou district", () => {
    expect(checkoutRecipientFromMetadata({
      full_name:"Ana", address:{street:"Rua A",district:"Bairro B", postal_code:"11111-111"},
    })).toMatchObject({
      name:"Ana",street:"Rua A",district:"Bairro B",postal_code:"11111-111",
    });
    expect(checkoutRecipientFromMetadata({
      full_name:"Ana", address:"Rua Antiga",
    }).street).toBe("Rua Antiga");
  });

  it("salva somente os dados da compradora, sem incluir dados do presente", () => {
    expect(checkoutMetadataFromRecipient({
      ...emptyCheckoutRecipient,
      name:"Mariana Silva", document:"123.456.789-01",
      phone:"(47) 99999-9999", postal_code:"88330-000",
      street:"Rua A", district:"Centro", state:"sc",
    })).toEqual({
      display_name:"Mariana Silva",document:"12345678901",
      phone:"(47) 99999-9999",
      address:{
        cep:"88330-000", street:"Rua A",number:"",
        complement:"",neighborhood:"Centro",city:"",state:"SC",
      },
    });
  });

  it("usa documento da compradora no pagamento de um presente", () => {
    expect(payerDocumentForPayment({
      gift:true,document:"11111111111", payer_document:"22222222222",
    })).toBe("22222222222");
  });

  it("mantém o mesmo documento de pagadora e destinatária na compra comum", () => {
    expect(payerDocumentForPayment({
      gift:false, document:"12345678901", payer_document:"22222222222",
    })).toBe("12345678901");
  });

  it("não deixa o presente usar silenciosamente o CPF da pessoa que recebe", () => {
    expect(() => payerDocumentForPayment({
      gift:true,document:"11111111111",payer_document:"",
    })).toThrow("CPF ou CNPJ");
  });
});
