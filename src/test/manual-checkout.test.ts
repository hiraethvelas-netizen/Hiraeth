import { describe, expect, it } from "vitest";
import { buildManualInquiryLink, validateManualRequest, type ManualRequestDetails } from "@/lib/manual-checkout";

describe("consulta manual pelo WhatsApp (sem checkout)", () => {
  it("inclui os itens e variantes sem dados pessoais ou totais desatualizados", () => {
    const url = buildManualInquiryLink("+55 (47) 99999-1234", [
      {name:"Casa da Águia",quantity:2,variantDetails:{size:"100 g",house:"Águia",options:{Tampa:"Fênix"}}},
    ]);
    expect(url).toMatch(/^https:\/\/wa\.me\/5547999991234\?text=/);
    const message = decodeURIComponent(url!.split("text=")[1]!);
    expect(message).toContain("2x Casa da Águia");
    expect(message).toContain("Tamanho: 100 g");
    expect(message).toContain("Casa: Águia");
    expect(message).toContain("Tampa: Fênix");
    expect(message).toContain("não um pedido confirmado");
    expect(message).toContain("antes de qualquer pagamento");
  });

  it("não gera link para contato inválido ou sacola vazia", () => {
    expect(buildManualInquiryLink("",[{name:"Vela",quantity:1}])).toBeNull();
    expect(buildManualInquiryLink("5547999991234",[])).toBeNull();
    expect(buildManualInquiryLink("https://site-inseguro.example",[{name:"Vela",quantity:1}])).toBeNull();
  });

  it("remove quebras de linha de nomes para evitar mensagens manipuladas", () => {
    const url = buildManualInquiryLink("5547999991234",[{name:"Vela\nPague agora",quantity:1}])!;
    expect(decodeURIComponent(url.split("text=")[1]!)).toContain("1x Vela Pague agora");
  });

  it("não inclui preço, documento ou endereço de cliente", () => {
    const url = buildManualInquiryLink("5547999991234",[{name:"Vela",quantity:1,variantDetails:{size:"250 g",document:"12345678900",address:"Endereço privado"}}])!;
    const message = decodeURIComponent(url.split("text=")[1]!);
    expect(message).not.toContain("12345678900");
    expect(message).not.toContain("Endereço privado");
    expect(message).toContain("valores");
  });
});

const sample: ManualRequestDetails = {
  name: "Pessoa Teste", email: "cliente@example.com", phone: "(47) 99999-1234",
  postal_code: "88330-000", street: "Rua das Flores", number: "125",
  complement: "Apto 10", district: "Centro", city: "Balneário Camboriú", state: "SC",
  isGift: true, note: "É um presente", paymentPreference: "pix",
};

describe("solicitação de atendimento com entrega por WhatsApp", () => {
  it("valida endereço e dados obrigatórios", () => {
    expect(validateManualRequest(sample)).toBeNull();
    expect(validateManualRequest({...sample, postal_code:"000"})).toContain("CEP");
    expect(validateManualRequest({...sample, city:""})).toContain("Preencha");
  });
  it("preenche o endereço, sem documento ou cartão, e avisa sobre confirmação manual", () => {
    const link=buildManualInquiryLink("5547999991234",[{name:"Brisa do Mar",quantity:1,variantDetails:{size:"100 g"}}],sample);
    expect(link).toContain("https://wa.me/5547999991234?text=");
    const text=decodeURIComponent(link!.split("text=")[1]!);
    expect(text).toContain("Rua das Flores, 125");
    expect(text).toContain("CEP: 88330000");
    expect(text).toContain("Balneário Camboriú/SC");
    expect(text).toContain("Preferência de pagamento: Pix");
    expect(text).toContain("A nota fiscal e o envio serão realizados pela Hiraeth");
    expect(text).not.toMatch(/CPF|12345678900/);
    expect(text).toContain("NÃO uma compra confirmada");
  });
  it("permite crédito apenas via link seguro, nunca solicita o número do cartão", () => {
    const link=buildManualInquiryLink("5547999991234",[{name:"Vela",quantity:1}],{...sample,paymentPreference:"credit"});
    const text=decodeURIComponent(link!.split("text=")[1]!);
    expect(text).toContain("Cartão de crédito (solicito link seguro)");
    expect(text).not.toContain("Número do cartão:");
  });
  it("inclui cupom apenas para conferência e opção de vídeo sem confirmar pagamento", () => {
    const link=buildManualInquiryLink("5547999991234",[{name:"Vela",quantity:1}],{
      ...sample,coupon:"TESTE10",packingVideoRequested:true,
    });
    const text=decodeURIComponent(link!.split("text=")[1]!);
    expect(text).toContain("Cupom para conferir: TESTE10");
    expect(text).toContain("Solicita vídeo da embalagem: sim");
    expect(text).toContain("NÃO uma compra confirmada");
  });

  it("recusa form inválido antes de construir WhatsApp", () => {
    expect(buildManualInquiryLink("5547999991234",[{name:"Vela",quantity:1}],{...sample,phone:""})).toBeNull();
  });
});
