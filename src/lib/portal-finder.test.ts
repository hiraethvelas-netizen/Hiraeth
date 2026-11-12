import { describe, expect, it } from "vitest";
import type { Tables } from "@/integrations/supabase/types";
import { findPortalForMood } from "@/lib/portal-finder";

type Product = Tables<"products">;
const candle = (id: string, name: string, status = "published", product_type = "candle") =>
  ({ id, name, slug: id, description: "", fragrance: name, status, product_type, category_id: null } as unknown as Product);

describe("Descobrir meu portal", () => {
  it("recomenda somente velas publicadas com características do clima escolhido", () => {
    const products = [
      candle("draft", "Floresta fresca", "draft"),
      candle("shirt", "Canela e baunilha", "published", "artifact"),
      candle("warm", "Chocolate e baunilha"),
      candle("fresh", "Bambu e alecrim"),
    ];
    const result = findPortalForMood(products, [], "frescor");
    expect(result).toEqual({ product: products[3], matched: true });
    expect(findPortalForMood(products, [], "aconchego")?.product.id).toBe("warm");
  });
  it("não finge que encontrou combinação quando não existem palavras relacionadas", () => {
    const result = findPortalForMood([candle("only", "Vela de teste")], [], "magia");
    expect(result).toEqual({ product: expect.objectContaining({ id: "only" }), matched: false });
    expect(findPortalForMood([], [], "magia")).toBeNull();
  });
});
