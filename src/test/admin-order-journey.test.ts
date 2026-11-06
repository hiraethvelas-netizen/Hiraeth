import { describe, expect, it } from "vitest";
import { orderItemVariantLabel, canRequestFinancialReview, orderLifecycleLabel } from "@/lib/order-operations";
import { nextSafeOrderStatus } from "@/lib/order-details";

describe("Administração: características das velas em pedidos", () => {
  it("mostra tamanho e casa escolhida mesmo quando o snapshot usa options", () => {
    expect(orderItemVariantLabel({
      options: { Tamanho:"100g", Casa:"Lufa-Lufa" },
      label:"100g",variantKey:"small::lufa-lufa",
    })).toBe("Tamanho: 100g · Casa: Lufa-Lufa");
  });
  it("exibe a casa do Chapéu Seletor e tamanho 250g", () => {
    expect(orderItemVariantLabel({
      house:"Corvinal",options:{Peso:"250g"},label:"250g",
    })).toBe("Tamanho: 250g · Casa: Corvinal");
  });
  it("mostra variantes simples e outras escolhas disponíveis no pedido", () => {
    expect(orderItemVariantLabel({label:"Vela 250g",options:{Tamanho:"250g",Essência:"Baunilha"}}))
      .toContain("Essência: Baunilha");
    expect(orderItemVariantLabel({variantKey:"large"})).toContain("large");
    expect(orderItemVariantLabel(null)).toBe("");
    expect(orderItemVariantLabel({options:{}})).toBe("");
  });
});

describe("Administração: linha do tempo de pedidos", () => {
  it("aceita pagamento confirmado para preparação, postagem e entrega", () => {
    expect(nextSafeOrderStatus("paid","approved","pending")).toBe("preparing");
    expect(nextSafeOrderStatus("paid","approved",null)).toBe("preparing");
    expect(nextSafeOrderStatus("preparing","approved","generated")).toBe("shipped");
    expect(nextSafeOrderStatus("preparing","approved","posted")).toBe("shipped");
    expect(nextSafeOrderStatus("shipped","approved","posted")).toBe("delivered");
    expect(nextSafeOrderStatus("delivered","approved","delivered")).toBeNull();
    expect(orderLifecycleLabel("preparing")).toBe("Em preparação");
  });
  it("não libera postagem, entrega ou reembolso sem pagamento confirmado", () => {
    expect(nextSafeOrderStatus("paid","pending","posted")).toBeNull();
    expect(nextSafeOrderStatus("preparing","approved","pending")).toBeNull();
    expect(nextSafeOrderStatus("preparing","approved","awaiting_label_payment")).toBeNull();
    expect(nextSafeOrderStatus("shipped","approved","generated")).toBeNull();
    expect(canRequestFinancialReview("pending","pending")).toBe(false);
  });
  it("solicita revisão financeira, mas nunca presume que foi reembolsado", () => {
    expect(canRequestFinancialReview("paid","approved")).toBe(true);
    expect(canRequestFinancialReview("preparing","approved")).toBe(true);
    expect(canRequestFinancialReview("shipped","approved")).toBe(true);
    expect(canRequestFinancialReview("delivered","approved")).toBe(true);
    expect(canRequestFinancialReview("refunded","approved")).toBe(false);
    expect(canRequestFinancialReview("cancelled","approved")).toBe(false);
  });
});
