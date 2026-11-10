import { describe, expect, it } from "vitest";
import { combineBenefits, promotionBenefit, type PromotionItem } from "@/lib/promotions";
import { allocateCartAutomaticDiscounts } from "@/lib/store-pricing";
import { calculateCheckoutPrice } from "../../supabase/functions/_shared/commerce-pricing";
import { allocateScopedDiscounts } from "../../supabase/functions/_shared/promotion-allocation";

const categories = [
  { id: "books", parent_id: null },
  { id: "magic", parent_id: "books" },
  { id: "thriller", parent_id: "books" },
  { id: "clothes", parent_id: null },
];
const items: PromotionItem[] = [
  { productId: "a", categoryId: "magic", quantity: 1, price: 100 },
  { productId: "b", categoryId: "thriller", quantity: 1, price: 100 },
  { productId: "c", categoryId: "clothes", quantity: 1, price: 100 },
];
const offer = {
  id: "offer",
  name: "Oferta",
  kind: "automatic_discount",
  active: true,
  visible: true,
  all_products: false,
  discount_type: "percent",
  discount_value: 60,
  min_cart_value: 0,
  buy_quantity: null as number | null,
  pay_quantity: null as number | null,
  eligible_product_ids: ["a"],
  eligible_category_ids: [] as string[],
  gift_name: null as string | null,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  usage_count: 0,
  code: null as string | null,
};
type Offer = typeof offer;

function comparePricing(offers: Offer[], rows = items, coupon = "", shipping = 20) {
  const candidates = offers.filter((p) => p.kind !== "coupon" || p.code === coupon);
  const benefits = candidates.flatMap((p) => {
    const benefit = promotionBenefit(p, rows, categories);
    return benefit ? [benefit] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);
  const client = combineBenefits(benefits, subtotal);
  const server = calculateCheckoutPrice(
    rows.map((row) => ({
      ...row,
      categoryId: row.categoryId ?? null,
      name: row.productId,
      variantKey: "",
      stockVariantKey: "",
      variantDetails: {},
      weightGrams: 100,
    })),
    offers,
    categories,
    coupon,
    shipping,
  );
  expect(client.discount).toBe(server.discount);
  expect(client.freeShipping).toBe(server.freeShipping);
  expect(client.gifts).toEqual(server.gifts);
  const automatic = client.applied.filter(
    (p) => candidates.find((offer) => offer.id === p.id)?.kind !== "coupon",
  );
  const lines = allocateCartAutomaticDiscounts(rows, offers, categories, automatic);
  expect(lines.reduce((sum, line) => sum + line.automaticDiscount, 0)).toBeCloseTo(
    automatic.reduce((sum, p) => sum + p.discount, 0),
  );
  for (let index = 0; index < rows.length; index++) {
    const allocated = client.applied.reduce((sum, p) => sum + (p.itemDiscounts?.[index] ?? 0), 0);
    expect(allocated).toBeLessThanOrEqual(rows[index]!.price * rows[index]!.quantity);
    expect(lines[index]!.discountedLineTotal).toBeGreaterThanOrEqual(0);
  }
  return { client, server, lines };
}

describe("Descontos acumulados respeitam os produtos participantes", () => {
  it("limita duas ofertas de 60% ao produto de R$100 e preserva o não participante", () => {
    const result = comparePricing([offer, { ...offer, id: "second" }], items.slice(0, 2));
    expect(result.client.discount).toBe(100);
    expect(result.lines.map((line) => line.discountedLineTotal)).toEqual([0, 100]);
    expect(result.server.total).toBe(120);
  });

  it("continua somando percentuais sobre o preço original, sem compor descontos", () => {
    const result = comparePricing(
      [
        { ...offer, discount_value: 20 },
        { ...offer, id: "coupon", kind: "coupon", code: "CHAMA", discount_value: 10 },
      ],
      items,
      "CHAMA",
    );
    expect(result.client.discount).toBe(30);
    expect(result.server.total).toBe(290);
  });

  it("preserva descontos válidos de ofertas com produtos distintos", () => {
    const result = comparePricing([offer, { ...offer, id: "second", eligible_product_ids: ["b"] }]);
    expect(result.client.discount).toBe(120);
    expect(result.lines.map((line) => line.automaticDiscount)).toEqual([60, 60, 0]);
  });

  it.each([false, true])(
    "realoca uma oferta de categoria para comportar uma oferta restrita, ordem invertida=%s",
    (reversed) => {
      const broad = {
        ...offer,
        id: "books",
        discount_type: "fixed",
        discount_value: 100,
        eligible_product_ids: [],
        eligible_category_ids: ["books"],
      };
      const narrow = { ...offer, id: "only-a", discount_value: 100 };
      const offers = reversed ? [narrow, broad] : [broad, narrow];
      const result = comparePricing(offers);
      expect(result.client.discount).toBe(200);
      expect(result.lines.map((line) => line.automaticDiscount)).toEqual([100, 100, 0]);
    },
  );

  it("preserva frete e brinde junto de cupom, automático e leve X pague Y", () => {
    const rows = [{ productId: "a", categoryId: "magic", quantity: 3, price: 100 }, items[2]!];
    const offers = [
      { ...offer, discount_value: 60 },
      { ...offer, id: "multibuy", kind: "buy_x_pay_y", buy_quantity: 3, pay_quantity: 2 },
      { ...offer, id: "coupon", kind: "coupon", code: "CHAMA", discount_value: 60 },
      { ...offer, id: "shipping", kind: "free_shipping" },
      { ...offer, id: "gift", kind: "gift", gift_name: "Marcador" },
    ];
    const result = comparePricing(offers, rows, "CHAMA");
    expect(result.client.discount).toBe(300);
    expect(result.client.freeShipping).toBe(true);
    expect(result.client.gifts).toEqual(["Marcador"]);
    expect(result.server.total).toBe(100);
    expect(result.lines[1]!.automaticDiscount).toBe(0);
  });

  it("não perde centavos nem os transfere a produtos não elegíveis", () => {
    const rows = [
      { productId: "a", quantity: 1, price: 0.03 },
      { productId: "b", quantity: 1, price: 0.07 },
      { productId: "c", quantity: 1, price: 1 },
    ];
    const result = comparePricing(
      [
        {
          ...offer,
          eligible_product_ids: ["a", "b"],
          discount_type: "fixed",
          discount_value: 0.05,
        },
        { ...offer, id: "only-a", discount_type: "fixed", discount_value: 0.03 },
      ],
      rows,
    );
    expect(result.client.discount).toBe(0.08);
    expect(result.lines[2]!.automaticDiscount).toBe(0);
  });
});

describe("Alocação ótima de descontos elegíveis", () => {
  it("encontra o mesmo máximo de uma busca exaustiva para escopos sobrepostos", () => {
    // Small integer-cent cases make an independent exhaustive oracle practical.
    const capacities = [2, 2, 2];
    for (const scopes of [
      [[0, 1], [0]],
      [
        [0, 1],
        [1, 2],
        [0, 2],
      ],
      [[0], [0], [1]],
    ]) {
      for (const demands of [
        [1, 2, 3],
        [3, 3, 3],
        [2, 1, 2],
      ]) {
        const offers = scopes.map((eligibleItems, index) => ({
          discount: demands[index]! / 100,
          eligibleItems,
        }));
        function best(offerIndex: number, remaining: number[]): number {
          if (offerIndex === offers.length) return 0;
          const scope = scopes[offerIndex]!;
          function assign(position: number, budget: number, available: number[]): number {
            if (position === scope.length) return best(offerIndex + 1, available);
            const item = scope[position]!;
            let maximum = 0;
            for (let value = 0; value <= Math.min(budget, available[item]!); value++) {
              const next = [...available];
              next[item]! -= value;
              maximum = Math.max(maximum, value + assign(position + 1, budget - value, next));
            }
            return maximum;
          }
          return assign(0, demands[offerIndex]!, remaining);
        }
        expect(
          allocateScopedDiscounts(
            capacities.map((value) => value / 100),
            offers,
          ).discount,
        ).toBe(best(0, capacities) / 100);
      }
    }
  });
});
