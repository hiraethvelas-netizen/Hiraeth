import { describe, expect, it } from "vitest";
import { PRODUCT_BADGE_OPTIONS, productBadgeLabel, productBadgeStyle } from "@/lib/product-badges";

describe("Selos das velas", () => {
  it("mantém os três selos existentes e adiciona Aroma Favorito", () => {
    expect(PRODUCT_BADGE_OPTIONS.map(option => option.value)).toEqual([
      "new", "limited", "bestseller", "favorite_scent",
    ]);
    expect(PRODUCT_BADGE_OPTIONS.map(option => option.label)).toEqual([
      "Novidade", "Edição limitada", "Mais vendido", "Aroma Favorito",
    ]);
  });

  it("aplica a identidade da marca ao novo selo e ignora valores desconhecidos", () => {
    expect(productBadgeLabel("favorite_scent")).toBe("Aroma Favorito");
    expect(productBadgeStyle("favorite_scent")).toContain("bg-[#5b1d04]");
    expect(productBadgeStyle("limited")).toBe("hiraeth-product-badge--limited");
    expect(productBadgeLabel(null)).toBe("");
    expect(productBadgeLabel("unknown")).toBe("");
  });
});
