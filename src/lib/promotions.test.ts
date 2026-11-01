import { describe, expect, it } from "vitest";
import { combineBenefits, promotionBenefit, type Promotion } from "./promotions";
const promotion: Promotion = {
  id: "promo",
  name: "Teste",
  kind: "coupon",
  active: true,
  visible: true,
  all_products: true,
  discount_type: "percent",
  discount_value: 10,
};
const items = [
  { productId: "hp", categoryId: "hp", price: 100, quantity: 2 },
  { productId: "verity", categoryId: "verity", price: 80, quantity: 1 },
];
const categories = [{ id: "books" }, { id: "hp", parent_id: "books" }, { id: "verity" }];
describe("Promotion rules", () => {
  it.each(["coupon", "automatic_discount"])(
    "calculates %s discounts only for selected products",
    (kind) => {
      expect(
        promotionBenefit(
          { ...promotion, kind, all_products: false, eligible_product_ids: ["verity"] },
          items,
          categories,
        )?.discount,
      ).toBe(8);
    },
  );
  it("includes descendants of selected categories without including unrelated products", () => {
    expect(
      promotionBenefit(
        { ...promotion, all_products: false, eligible_category_ids: ["books"] },
        items,
        categories,
      )?.discount,
    ).toBe(20);
  });
  it("does not apply an empty restricted selection", () => {
    expect(promotionBenefit({ ...promotion, all_products: false }, items)).toBeNull();
  });
  it("limits a fixed discount to the eligible subtotal", () => {
    expect(
      promotionBenefit(
        {
          ...promotion,
          discount_type: "fixed",
          discount_value: 999,
          all_products: false,
          eligible_product_ids: ["verity"],
        },
        items,
      )?.discount,
    ).toBe(80);
  });
  it("makes the cheapest eligible units free for buy X pay Y", () => {
    expect(
      promotionBenefit(
        { ...promotion, kind: "buy_x_pay_y", buy_quantity: 3, pay_quantity: 2 },
        items,
      )?.discount,
    ).toBe(80);
    expect(
      promotionBenefit({ ...promotion, kind: "buy_x_pay_y", buy_quantity: 3, pay_quantity: 2 }, [
        { productId: "one", price: 30, quantity: 6 },
      ])?.discount,
    ).toBe(60);
  });
  it("does not apply buy X pay Y to insufficient units or invalid rules", () => {
    expect(
      promotionBenefit(
        { ...promotion, kind: "buy_x_pay_y", buy_quantity: 4, pay_quantity: 2 },
        items,
      ),
    ).toBeNull();
    expect(
      promotionBenefit(
        { ...promotion, kind: "buy_x_pay_y", buy_quantity: 2, pay_quantity: 3 },
        items,
      ),
    ).toBeNull();
  });
  it("applies free shipping and gifts only to eligible selections", () => {
    expect(promotionBenefit({ ...promotion, kind: "free_shipping" }, items)?.freeShipping).toBe(
      true,
    );
    expect(
      promotionBenefit({ ...promotion, kind: "gift", gift_name: "Marcador" }, items)?.gift,
    ).toBe("Marcador");
    expect(
      promotionBenefit(
        {
          ...promotion,
          kind: "gift",
          gift_name: "Marcador",
          all_products: false,
          eligible_product_ids: ["missing"],
        },
        items,
      ),
    ).toBeNull();
  });
  it.each([
    { active: false },
    { visible: false },
    { min_cart_value: 300 },
    { usage_limit: 1, usage_count: 1 },
    { starts_at: "2100-01-01" },
    { ends_at: "2000-01-01" },
    { starts_at: "invalid" },
  ])("rejects ineligible conditions %j", (condition) => {
    expect(promotionBenefit({ ...promotion, ...condition }, items)).toBeNull();
  });
  it("adds monetary discounts and keeps shipping and gift benefits", () => {
    const benefits = [
      promotionBenefit(promotion, items)!,
      promotionBenefit({ ...promotion, id: "larger", discount_value: 20 }, items)!,
      promotionBenefit({ ...promotion, id: "shipping", kind: "free_shipping" }, items)!,
      promotionBenefit({ ...promotion, id: "gift", kind: "gift", gift_name: "Marcador" }, items)!,
    ];
    const total = combineBenefits(benefits);
    expect(total.discount).toBe(84);
    expect(total.freeShipping).toBe(true);
    expect(total.gifts).toEqual(["Marcador"]);
    expect(total.applied.map((p) => p.id)).toContain("promo");
  });
  it("terminates category traversal for invalid cyclic category data", () => {
    expect(
      promotionBenefit(
        { ...promotion, all_products: false, eligible_category_ids: ["other"] },
        items,
        [{ id: "hp", parent_id: "hp" }],
      ),
    ).toBeNull();
  });
  it("caps all combined discounts at the cart total", () => {
    const benefit = promotionBenefit(
      { ...promotion, discount_type: "fixed", discount_value: 250 },
      items,
    )!;
    const result = combineBenefits([benefit, { ...benefit, id: "second" }], 280);
    expect(result.discount).toBe(280);
    expect(result.applied.map((benefit) => benefit.discount)).toEqual([250, 30]);
  });
});
