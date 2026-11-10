import { allocateScopedDiscounts } from "../../supabase/functions/_shared/promotion-allocation";

export type Promotion = {
  id: string;
  name: string;
  kind: string;
  active?: boolean;
  visible?: boolean;
  discount_type?: string | null;
  discount_value?: number | string;
  min_cart_value?: number | string;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  all_products?: boolean;
  eligible_product_ids?: string[];
  eligible_category_ids?: string[];
  gift_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  usage_count?: number;
  code?: string | null;
};
export type PromotionItem = {
  productId: string;
  categoryId?: string | null;
  quantity: number;
  price: number;
};
export type PromotionCategory = { id: string; parent_id?: string | null };
export type PromotionBenefit = {
  id: string;
  name: string;
  discount: number;
  freeShipping: boolean;
  gift: string | null;
  eligibleSubtotals?: number[];
  itemDiscounts?: number[];
};
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function eligibleForPromotion(
  promotion: Promotion,
  item: PromotionItem,
  categories: PromotionCategory[],
) {
  if (promotion.all_products !== false) return true;
  if (promotion.eligible_product_ids?.includes(item.productId)) return true;
  let id = item.categoryId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    if (promotion.eligible_category_ids?.includes(id)) return true;
    seen.add(id);
    id = categories.find((category) => category.id === id)?.parent_id;
  }
  return false;
}

export function promotionBenefit(
  promotion: Promotion,
  items: PromotionItem[],
  categories: PromotionCategory[] = [],
  now = new Date(),
): PromotionBenefit | null {
  if (promotion.active === false || promotion.visible === false) return null;
  if (promotion.starts_at && !(new Date(promotion.starts_at).getTime() <= now.getTime()))
    return null;
  if (promotion.ends_at && !(new Date(promotion.ends_at).getTime() >= now.getTime())) return null;
  if (promotion.usage_limit != null && (promotion.usage_count ?? 0) >= promotion.usage_limit)
    return null;
  const validItems = items.filter(
    (item) =>
      Number.isFinite(item.price) &&
      item.price >= 0 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
  );
  const subtotal = money(validItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  if (subtotal < Number(promotion.min_cart_value ?? 0)) return null;
  const eligible = validItems.filter((item) => eligibleForPromotion(promotion, item, categories));
  if (!eligible.length) return null;
  const eligibleTotal = money(eligible.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const benefit: PromotionBenefit = {
    id: promotion.id,
    name: promotion.name,
    discount: 0,
    freeShipping: false,
    gift: null,
    eligibleSubtotals: items.map(item => validItems.includes(item) && eligibleForPromotion(promotion, item, categories)
      ? money(item.price * item.quantity) : 0),
  };
  if (["coupon", "automatic_discount"].includes(promotion.kind)) {
    const value = Number(promotion.discount_value ?? 0);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      !["percent", "fixed"].includes(promotion.discount_type ?? "") ||
      (promotion.discount_type === "percent" && value > 100)
    )
      return null;
    benefit.discount = money(
      Math.min(
        eligibleTotal,
        promotion.discount_type === "percent" ? (eligibleTotal * value) / 100 : value,
      ),
    );
  } else if (promotion.kind === "buy_x_pay_y") {
    const buy = promotion.buy_quantity ?? 0,
      pay = promotion.pay_quantity ?? 0;
    if (!Number.isInteger(buy) || !Number.isInteger(pay) || buy <= pay || pay < 1) return null;
    let free =
      Math.floor(eligible.reduce((sum, item) => sum + item.quantity, 0) / buy) * (buy - pay);
    if (!free) return null;
    for (const item of [...eligible].sort((a, b) => a.price - b.price)) {
      const count = Math.min(item.quantity, free);
      benefit.discount += count * item.price;
      free -= count;
      if (!free) break;
    }
    benefit.discount = money(benefit.discount);
  } else if (promotion.kind === "free_shipping") benefit.freeShipping = true;
  else if (promotion.kind === "gift" && promotion.gift_name?.trim())
    benefit.gift = promotion.gift_name.trim();
  else return null;
  return benefit;
}

/** Owner's rule: add monetary discounts; shipping and gifts may accumulate. */
export function combineBenefits(
  benefits: PromotionBenefit[],
  maximumDiscount = Number.POSITIVE_INFINITY,
) {
  const scoped = benefits.some(benefit => benefit.eligibleSubtotals !== undefined);
  const itemCount = Math.max(0, ...benefits.map(benefit => benefit.eligibleSubtotals?.length ?? 0));
  const subtotals = scoped
    ? Array.from({ length: itemCount }, (_, index) =>
        Math.max(0, ...benefits.map(benefit => benefit.eligibleSubtotals?.[index] ?? 0)))
    : [benefits.reduce((sum, benefit) => sum + benefit.discount, 0)];
  const allocation = allocateScopedDiscounts(subtotals, benefits.map(benefit => ({
    discount: benefit.discount,
    eligibleItems: subtotals.flatMap((_, index) =>
      !benefit.eligibleSubtotals || benefit.eligibleSubtotals[index]! > 0 ? [index] : []),
  })), maximumDiscount);
  const applied = benefits
    .map((benefit, index) => {
      const { eligibleSubtotals: _scope, ...summary } = benefit;
      return { ...summary, discount: allocation.discounts[index]!,
        ...(scoped ? { itemDiscounts: allocation.allocations[index]! } : {}) };
    })
    .filter((benefit) => benefit.discount > 0 || benefit.freeShipping || benefit.gift);
  return {
    discount: money(applied.reduce((total, benefit) => total + benefit.discount, 0)),
    freeShipping: applied.some((benefit) => benefit.freeShipping),
    gifts: [...new Set(applied.flatMap((benefit) => (benefit.gift ? [benefit.gift] : [])))],
    applied,
  };
}
