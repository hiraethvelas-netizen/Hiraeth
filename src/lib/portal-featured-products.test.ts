import { describe, expect, it } from "vitest";
import { portalFeaturedProductIds, updatePortalFeaturedProducts } from "@/lib/portal-featured-products";

describe("Vitrine selecionável de velas no portal NFC", () => {
  it("conserva a paleta, galeria e outras configurações ao escolher velas", () => {
    const theme = { palette: { background: "#111923" }, carousel_items: [{ id: "natal" }], extra: true };
    const next = updatePortalFeaturedProducts(theme, ["a", "b", "c", "d", "e"]);
    expect(next["palette"]).toEqual(theme.palette);
    expect(next["carousel_items"]).toEqual(theme.carousel_items);
    expect(next["extra"]).toBe(true);
    expect(portalFeaturedProductIds(next)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("limita a cinco sem duplicados e descarta valores inválidos", () => {
    expect(portalFeaturedProductIds({ featured_product_ids: ["a", "a", null, 4, "b", "c", "d", "e", "f"] }))
      .toEqual(["a", "b", "c", "d", "e"]);
    expect(portalFeaturedProductIds(null)).toEqual([]);
    expect(portalFeaturedProductIds({ featured_product_ids: "não é uma lista" })).toEqual([]);
    expect(portalFeaturedProductIds(updatePortalFeaturedProducts({}, ["1", "2", "3", "4", "5", "6"])))
      .toEqual(["1", "2", "3", "4", "5"]);
  });
});
