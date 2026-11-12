import { describe, expect, it } from "vitest";
import type { Tables } from "@/integrations/supabase/types";
import { findPortalForMood, PORTAL_MOODS } from "@/lib/portal-finder";

type Product = Tables<"products">;
const candle = (id: string, name: string, status = "published", product_type = "candle", description = "", fragrance = "") =>
  ({ id, name, slug: id, description, fragrance, status, product_type, category_id: null } as unknown as Product);

describe("Descobrir meu portal: correspondência real entre aromas e emoções", () => {
  it("recomenda somente velas publicadas e considera o aroma escolhido", () => {
    const products = [
      candle("draft", "Floresta fresca", "draft", "candle", "Um ar puro de floresta."),
      candle("shirt", "Canela e baunilha", "published", "artifact"),
      candle("warm", "Chocolate e baunilha"),
      candle("fresh", "Bambu e alecrim"),
    ];
    expect(findPortalForMood(products, [], "frescor")).toEqual({ product: products[3], matched: true });
    expect(findPortalForMood(products, [], "aconchego")?.product.id).toBe("warm");
  });

  it("não inventa uma correspondência quando não há nenhuma vela publicada adequada", () => {
    expect(findPortalForMood([candle("only", "Vela de teste")], [], "magia")).toBeNull();
    expect(findPortalForMood([], [], "magia")).toBeNull();
    expect(findPortalForMood([candle("draft", "Surpresa de Natal", "draft")], [], "misterio")).toBeNull();
  });

  it("diferencia Frescor de Mistério mesmo quando todas as velas pertencem ao Mundo da Magia", () => {
    const products = [
      candle("aguia-100", "Casa da Águia 100g", "published", "candle",
        "Uma sala comunal nas alturas com aroma fresco de Floresta de Inverno, ar puro e notas da natureza."),
      candle("aguia-250", "Casa da Águia 250g", "published", "candle",
        "Uma sala comunal nas alturas com aroma fresco de Floresta de Inverno, ar puro e notas da natureza."),
      candle("surpresa", "Surpresa de Natal", "published", "candle",
        "Um presente misterioso com uma fragrância inesperada e um novo portal. Por enquanto é segredo."),
      candle("fios", "Entre Fios e Magia", "published", "candle",
        "O carinho do presente e o aconchego de um abraço.", "Baunilha & Canela"),
      candle("salao", "O grande salão de natal", "published", "candle",
        "Luzes encantadas e a magia de um grande salão de castelo."),
    ];
    const result = Object.fromEntries(PORTAL_MOODS.map(item =>
      [item.id, findPortalForMood(products, [], item.id)?.product.id ?? null]));
    expect(result["frescor"]).toBe("aguia-100");
    expect(result["misterio"]).toBe("surpresa");
    expect(result["aconchego"]).toBe("fios");
    expect(result["magia"]).toBe("salao");
    expect(new Set(Object.values(result)).size).toBe(4);
  });

  it("não usa tamanhos 100g e 250g da mesma vela para fingir que há dois aromas diferentes", () => {
    const products = [
      candle("aguia-p", "Casa da Águia 100g", "published", "candle", "Frescor da floresta com ar puro."),
      candle("aguia-g", "Casa da Águia 250g", "published", "candle", "Frescor da floresta com ar puro."),
    ];
    expect(findPortalForMood(products, [], "frescor")?.product.id).toBe("aguia-p");
    expect(findPortalForMood(products, [], "misterio")).toBeNull();
  });

  it("não confunde palavras parciais e usa uma alternativa se a melhor vela já foi escolhida para outro clima", () => {
    const products = [
      candle("fresco", "Brisa do Mar", "published", "candle", "Aroma fresco de oceano e praia."),
      candle("misterio", "Noite de Segredos", "published", "candle", "Perfume profundo, noturno e misterioso."),
      candle("sombra", "Sombra Fresca", "published", "candle", "Notas de bambu e alecrim."),
    ];
    const fresh = findPortalForMood(products, [], "frescor")?.product.id;
    const mystery = findPortalForMood(products, [], "misterio")?.product.id;
    expect(fresh).toBeTruthy();
    expect(mystery).toBe("misterio");
    expect(fresh).not.toBe(mystery);
  });
});
