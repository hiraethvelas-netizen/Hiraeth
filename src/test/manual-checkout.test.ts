import { describe, expect, it } from "vitest";
import { buildManualInquiryLink } from "@/lib/manual-checkout";

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
