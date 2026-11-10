import { allocateScopedDiscounts } from "./promotion-allocation.ts";

export type ItemInput = { productId: string; quantity: number; variantKey?: string };
export type SnapshotItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variantKey: string;
  stockVariantKey: string;
  variantDetails: Record<string, unknown>;
  categoryId: string | null;
  weightGrams: number;
  shippingSize?: "small" | "large";
};
type Promotion = {
  id: string; name: string; kind: string; active: boolean; visible: boolean;
  discount_type: string | null; discount_value: number;
  min_cart_value: number; buy_quantity: number | null; pay_quantity: number | null;
  all_products: boolean; eligible_product_ids: string[]; eligible_category_ids: string[];
  gift_name: string | null; starts_at: string | null; ends_at: string | null;
  usage_limit: number | null; usage_count: number; code: string | null;
};
type Category = { id: string; parent_id: string | null };
type Benefit = { id: string; name: string; discount: number; freeShipping: boolean; gift: string | null };
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function validateItems(input: unknown): ItemInput[] {
  if (!Array.isArray(input) || !input.length || input.length > 30)
    throw new Error("Adicione entre 1 e 30 opções de produtos à sacola.");
  const seen = new Set<string>();
  return input.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Produto inválido.");
    const row = raw as Record<string, unknown>;
    const productId = String(row['productId'] ?? "");
    const quantity = Number(row['quantity']);
    const variantKey = typeof row['variantKey'] === "string" ? row['variantKey'] : "";
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(productId))
      throw new Error("Identificação do produto inválida.");
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100)
      throw new Error("Quantidade inválida.");
    if (seen.has(productId + "::" + variantKey))
      throw new Error("Existem produtos duplicados na sacola.");
    seen.add(productId + "::" + variantKey);
    return { productId, quantity, variantKey };
  });
}

/** Size is derived from the server-side variant, never the customer's cart. */
function candleSize(variant: any): "small" | "large" | undefined {
  if (!variant) return undefined;
  const options = variant.options && typeof variant.options === "object" ? variant.options : {};
  const sizeOption = Object.entries(options)
    .find(([key]) => /^(tamanho|peso)$/i.test(key.trim()))?.[1];
  const label = sizeOption ?? (variant.type === "size" ? variant.label : undefined);
  const value = typeof label === "string" ? label.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
  if (/^(100\s*g|pequena|pequeno)$/.test(value)) return "small";
  if (/^(250\s*g|grande)$/.test(value)) return "large";
  return undefined;
}

export function snapshotProducts(
  items: ItemInput[],
  products: Array<any>,
  defaultWeightGrams = 0,
): SnapshotItem[] {
  return items.map(item => {
    const product = products.find(row => row.id === item.productId);
    if (!product || product.status !== "published") throw new Error("Produto indisponível. Atualize sua sacola.");
    const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
    let variant: any = null;
    let stockVariantKey = item.variantKey ?? "";
    let houseLabel: string | undefined;
    if (item.variantKey) {
      variant = variants.find(row => String(row.key ?? row.id ?? row.label ?? "") === item.variantKey) ?? null;
      if (!variant) {
        // Legacy candles can have a size + house stored as "sizeKey::houseKey".
        // Only the size variant owns the inventory and price. A house is a
        // selectable scent, not an additional independent stock pool.
        const [sizeKey, houseKey] = item.variantKey.split("::");
        variant = variants.find(row => row.type !== "house" &&
          String(row.key ?? row.id ?? row.label ?? "") === sizeKey) ?? null;
        if (!variant || !houseKey || !variants.some(row => row.type === "house" &&
          String(row.key ?? row.id ?? row.label ?? "") === houseKey))
          throw new Error("Uma variação do produto mudou. Revise a sacola.");
        stockVariantKey = String(variant.key ?? variant.id ?? variant.label);
        const house = variants.find(row => row.type === "house" &&
          String(row.key ?? row.id ?? row.label ?? "") === houseKey);
        houseLabel = String(house?.label ?? houseKey);
      }
    } else if (variants.length) {
      throw new Error("Escolha uma variação deste produto antes de continuar.");
    }
    const stock = Number(variant?.stock ?? product.stock);
    if (!Number.isSafeInteger(stock) || stock < item.quantity)
      throw new Error("Estoque insuficiente para " + product.name + ".");
    const original = Number(variant?.price ?? product.price);
    const sale = variant?.sale_price ?? product.sale_price;
    const price = sale != null && Number(sale) >= 0 && Number(sale) < original
      ? Number(sale) : original;
    if (!Number.isFinite(price) || price <= 0 || price > 100000)
      throw new Error("Preço de produto inválido.");
    const shippingSize = product.product_type === "candle" ? candleSize(variant) : undefined;
    const explicitVariantWeight = variant?.weight_grams == null || variant.weight_grams === ""
      ? 0 : Number(variant.weight_grams);
    // Known pot + lid + wax weights, confirmed for Hiraeth's 100 g and 250 g
    // candle sizes. Protective shipping packaging is weighed separately.
    const candleWeight = shippingSize === "small" ? 180 : shippingSize === "large" ? 616 : 0;
    const grams = explicitVariantWeight || candleWeight ||
      Number(product.weight_grams) || defaultWeightGrams;
    if (!Number.isFinite(grams) || grams <= 0 || grams > 30000)
      throw new Error("Configure o peso de envio dos produtos antes de calcular o frete.");
    return {
      productId: item.productId,
      name: String(product.name).slice(0,180),
      quantity: item.quantity,
      price: money(price),
      variantKey: item.variantKey ?? "",
      stockVariantKey,
      variantDetails: variant ? {
        options: variant.options ?? {},
        label: variant.label ?? "",
        ...(houseLabel ? {house:houseLabel} : {}),
        variantKey: item.variantKey,
        stockVariantKey,
        originalPrice: original,
      } : { originalPrice: original },
      categoryId: product.category_id ?? null,
      weightGrams: grams,
      ...(shippingSize ? { shippingSize } : {}),
    };
  });
}

function eligible(p: Promotion, item: SnapshotItem, categories: Category[]) {
  if (p.all_products) return true;
  if (p.eligible_product_ids?.includes(item.productId)) return true;
  let id = item.categoryId;
  const visited = new Set<string>();
  while (id && !visited.has(id)) {
    if (p.eligible_category_ids?.includes(id)) return true;
    visited.add(id);
    id = categories.find(c => c.id === id)?.parent_id ?? null;
  }
  return false;
}

function benefit(p: Promotion, items: SnapshotItem[], categories: Category[], now: Date): Benefit | null {
  if (!p.active || !p.visible ||
      (p.starts_at && new Date(p.starts_at) > now) ||
      (p.ends_at && new Date(p.ends_at) < now) ||
      (p.usage_limit != null && p.usage_count >= p.usage_limit)) return null;
  const subtotal = money(items.reduce((n,i) => n+i.price*i.quantity,0));
  if (subtotal < Number(p.min_cart_value ?? 0)) return null;
  const eligibleItems = items.filter(i => eligible(p,i,categories));
  if (!eligibleItems.length) return null;
  const eligibleTotal = money(eligibleItems.reduce((n,i)=>n+i.price*i.quantity,0));
  const result: Benefit = {id:p.id,name:p.name,discount:0,freeShipping:false,gift:null};
  if (p.kind === "coupon" || p.kind === "automatic_discount") {
    const amount = Number(p.discount_value);
    if (!Number.isFinite(amount) || amount <= 0 ||
        !["fixed","percent"].includes(p.discount_type ?? "") ||
        (p.discount_type === "percent" && amount > 100)) return null;
    result.discount=money(Math.min(eligibleTotal,p.discount_type==="percent"?eligibleTotal*amount/100:amount));
  } else if (p.kind === "buy_x_pay_y") {
    const buy=Number(p.buy_quantity),pay=Number(p.pay_quantity);
    if (!Number.isInteger(buy)||!Number.isInteger(pay)||pay<1||buy<=pay) return null;
    let free=Math.floor(eligibleItems.reduce((n,i)=>n+i.quantity,0)/buy)*(buy-pay);
    if (!free) return null;
    for (const item of [...eligibleItems].sort((a,b)=>a.price-b.price)) {
      const count=Math.min(item.quantity,free);
      result.discount+=count*item.price;
      free-=count;if(!free)break;
    }
    result.discount=money(result.discount);
  } else if (p.kind==="free_shipping") result.freeShipping=true;
  else if (p.kind==="gift" && p.gift_name?.trim()) result.gift=p.gift_name.trim();
  else return null;
  return result;
}

export function calculateCheckoutPrice(
  items: SnapshotItem[],
  promotions: Promotion[],
  categories: Category[],
  couponCode: string,
  shippingPrice: number,
  now = new Date(),
) {
  const subtotal = money(items.reduce((sum,item)=>sum+item.price*item.quantity,0));
  const code=couponCode.trim().toUpperCase();
  const coupon=code ? promotions.find(p => p.kind==="coupon" && p.code?.toUpperCase()===code) : undefined;
  if (code && !coupon) throw new Error("Cupom não encontrado ou expirado.");
  const candidates=promotions.filter(p => p.kind!=="coupon" || p.id===coupon?.id);
  const benefits=candidates.map(p=>benefit(p,items,categories,now)).filter((b):b is Benefit=>!!b);
  if (code && !benefits.some(b=>b.id===coupon?.id)) throw new Error("Cupom não disponível para esta compra.");
  const allocation=allocateScopedDiscounts(items.map(item=>money(item.price*item.quantity)),
    benefits.map(b=>({discount:b.discount,eligibleItems:items.flatMap((item,index)=>{
      const promotion=candidates.find(p=>p.id===b.id)!;
      return eligible(promotion,item,categories)?[index]:[];
    })})),subtotal);
  const applied=benefits.map((b,index)=>({...b,discount:allocation.discounts[index]!,
    itemDiscounts:allocation.allocations[index]!}))
    .filter(b=>b.discount>0||b.freeShipping||b.gift);
  const discount=allocation.discount;
  const shipping=applied.some(b=>b.freeShipping)?0:money(shippingPrice);
  const total=money(subtotal-discount+shipping);
  if (total<=0) throw new Error("Pagamento de valor zero exige tratamento especial.");
  return {subtotal,discount,shipping,total,
    applied, freeShipping:shipping===0,
    gifts:[...new Set(applied.flatMap(b=>b.gift?[b.gift]:[]))],
    coupon_code:code || null};
}
