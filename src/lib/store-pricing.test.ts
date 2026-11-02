import { describe, expect, it } from "vitest";
import {
  allocateCartAutomaticDiscounts, visiblePrice,
} from "./store-pricing";
import type { Promotion, PromotionCategory } from "./promotions";

const allStore: Promotion = {
  id: "store-20", name: "Acervo com desconto", kind: "automatic_discount",
  active: true, visible: true, all_products: true,
  discount_type: "percent", discount_value: 20,
};
const categories: PromotionCategory[] = [
  { id: "livros", parent_id: null },
  { id: "magia", parent_id: "livros" },
  { id: "series", parent_id: null },
];

describe("Preços promocionais na Loja", () => {
  it("shows the original price struck through next to a 20% store-wide promotion", () => {
    expect(visiblePrice({ id: "vela", category_id: "magia", price: 100, sale_price: null },
      [allStore], categories)).toEqual({
        original: 100, current: 80, automaticDiscount: 20, hasDiscount: true,
      });
  });

  it("does not apply the same automatic discount twice to an existing product sale", () => {
    const shown = visiblePrice({
      id: "vela", category_id: "magia", price: 100, sale_price: 90,
    }, [allStore], categories);
    expect(shown).toMatchObject({ original: 100, current: 72, automaticDiscount: 18 });
  });

  it("restricts category offers to products of that universe and its subcategories", () => {
    const limited = { ...allStore, all_products: false, eligible_category_ids: ["livros"] };
    expect(visiblePrice({ id: "a", category_id: "magia", price: 50, sale_price: null },
      [limited], categories).current).toBe(40);
    expect(visiblePrice({ id: "b", category_id: "series", price: 50, sale_price: null },
      [limited], categories).current).toBe(50);
  });

  it("does not advertise conditional, fixed or buy-X-pay-Y cart offers as certain unit prices", () => {
    const product = { id: "a", category_id: "magia", price: 50, sale_price: null };
    const offers: Promotion[] = [
      { ...allStore, id: "minimum", min_cart_value: 200 },
      { ...allStore, id: "fixed", discount_type: "fixed", discount_value: 10 },
      { ...allStore, id: "buy-more", kind: "buy_x_pay_y", buy_quantity: 3, pay_quantity: 2 },
    ];
    expect(visiblePrice(product, offers, categories).current).toBe(50);
  });

  it("caps stacked percent discounts at the product price", () => {
    const offers = [
      { ...allStore, id: "first", discount_value: 60 },
      { ...allStore, id: "second", discount_value: 60 },
    ];
    expect(visiblePrice({ id: "a", category_id: "magia", price: 100, sale_price: null },
      offers, categories).current).toBe(0);
  });
});

describe("Descontos por item na sacola", () => {
  const items = [
    { productId: "vela", categoryId: "magia", quantity: 2, price: 50 },
    { productId: "camiseta", categoryId: "series", quantity: 1, price: 100 },
  ];

  it("distributes a storewide discount without changing the stored cart prices", () => {
    const allocated = allocateCartAutomaticDiscounts(items, [allStore], categories, [
      { id: "store-20", discount: 40 },
    ]);
    expect(allocated.map(line => line.discountedLineTotal)).toEqual([80, 80]);
    expect(allocated.reduce((sum, line) => sum + line.automaticDiscount, 0)).toBe(40);
    expect(items[0]!.price).toBe(50);
  });

  it("keeps promotions limited to eligible products", () => {
    const offer = { ...allStore, id: "only-books", all_products: false, eligible_category_ids: ["livros"] };
    const allocated = allocateCartAutomaticDiscounts(items, [offer], categories, [
      { id: "only-books", discount: 20 },
    ]);
    expect(allocated.map(line => line.automaticDiscount)).toEqual([20, 0]);
  });

  it("allocates fixed discount cents exactly without creating negative prices", () => {
    const tinyItems = [
      { productId: "a", quantity: 1, price: 0.01 },
      { productId: "b", quantity: 1, price: 0.01 },
      { productId: "c", quantity: 1, price: 0.01 },
    ];
    const allocations = allocateCartAutomaticDiscounts(tinyItems, [
      { ...allStore, id: "fixed", discount_type: "fixed", discount_value: 0.02 },
    ], categories, [{ id: "fixed", discount: 0.02 }]);
    const total = allocations.reduce((sum, item) => sum + item.automaticDiscount, 0);
    expect(total).toBeCloseTo(0.02);
    expect(allocations.every(item => item.discountedLineTotal >= 0)).toBe(true);
  });

  it("does not distribute a coupon as an automatic line-item discount", () => {
    const allocated = allocateCartAutomaticDiscounts(items, [allStore], categories, []);
    expect(allocated.every(item => item.hasDiscount === false)).toBe(true);
  });
});
