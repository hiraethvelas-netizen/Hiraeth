import { allocateScopedDiscounts } from "../../supabase/functions/_shared/promotion-allocation";
import {
  combineBenefits, eligibleForPromotion, promotionBenefit,
  type Promotion, type PromotionCategory, type PromotionItem,
} from "@/lib/promotions";

const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => Math.round(value * 100) / 100;

export type VisiblePrice = {
  original: number;
  current: number;
  hasDiscount: boolean;
  automaticDiscount: number;
};

export type PricedProduct = {
  id: string;
  category_id: string | null;
  price: number;
  sale_price: number | null;
};

/**
 * Public price preview: only unconditional per-item percentage promotions.
 * Fixed cart-wide promotions and buy-X-pay-Y are shown in the cart, not as a
 * misleading per-product price. A product's own sale_price still applies.
 */
export function visiblePrice(
  product: PricedProduct,
  promotions: Promotion[] = [],
  categories: PromotionCategory[] = [],
  now = new Date(),
): VisiblePrice {
  const original = Number(product.price);
  const sale = product.sale_price === null ? null : Number(product.sale_price);
  const current = sale !== null && Number.isFinite(sale) && sale >= 0 && sale < original ? sale : original;
  if (!Number.isFinite(current) || current < 0 || !Number.isFinite(original)) {
    return { original: 0, current: 0, hasDiscount: false, automaticDiscount: 0 };
  }

  const item: PromotionItem = {
    productId: product.id, categoryId: product.category_id,
    quantity: 1, price: current,
  };
  const eligibleDiscounts = promotions.flatMap(promotion => {
    // A minimum purchase, fixed amount or multi-buy cannot be guaranteed
    // from a single catalog tile. They are applied at cart level instead.
    if (promotion.kind !== "automatic_discount" ||
        promotion.discount_type !== "percent" ||
        Number(promotion.min_cart_value ?? 0) > 0) return [];
    const benefit = promotionBenefit(promotion, [item], categories, now);
    return benefit ? [benefit] : [];
  });
  const automaticDiscount = combineBenefits(eligibleDiscounts, current).discount;
  const discounted = money(Math.max(0, current - automaticDiscount));
  return {
    original,
    current: discounted,
    hasDiscount: cents(discounted) < cents(original),
    automaticDiscount,
  };
}

export type CartPriceAllocation = {
  originalLineTotal: number;
  discountedLineTotal: number;
  automaticDiscount: number;
  originalUnit: number;
  discountedUnit: number;
  hasDiscount: boolean;
};

/**
 * Allocate the already-approved automatic discounts across qualifying cart
 * rows. The sum of line discounts equals the automatic benefits shown in the
 * summary, so neither the coupon nor discounts are subtracted twice.
 */
export function allocateCartAutomaticDiscounts(
  items: PromotionItem[],
  promotions: Promotion[],
  categories: PromotionCategory[],
  applied: { id: string; discount: number; itemDiscounts?: number[] }[],
): CartPriceAllocation[] {
  const lineCents = items.map(item => Math.max(0, cents(item.price * item.quantity)));
  // Reuse the exact allocation when combineBenefits also considered a coupon.
  // Otherwise solve all scopes together instead of greedily consuming a row.
  const allocation = allocateScopedDiscounts(lineCents.map(value => value / 100), applied.map(benefit => {
    const promotion = promotions.find(item => item.id === benefit.id);
    return { discount: benefit.discount, eligibleItems: items.flatMap((item, index) =>
      promotion && eligibleForPromotion(promotion, item, categories) ? [index] : []) };
  }));
  const reductions = items.map((_, index) => Math.min(lineCents[index]!, applied.reduce((sum, benefit, offerIndex) =>
    sum + cents(benefit.itemDiscounts?.[index] ?? allocation.allocations[offerIndex]![index]!), 0)));
  return items.map((item, index) => {
    const originalLineTotal = lineCents[index]! / 100;
    const automaticDiscount = reductions[index]! / 100;
    const discountedLineTotal = money(originalLineTotal - automaticDiscount);
    return {
      originalLineTotal, automaticDiscount, discountedLineTotal,
      originalUnit: item.price,
      discountedUnit: item.quantity > 0 ? money(discountedLineTotal / item.quantity) : item.price,
      hasDiscount: automaticDiscount > 0,
    };
  });
}
