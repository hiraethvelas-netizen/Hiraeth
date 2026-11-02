/**
 * Deterministic parcel calculation, shared by quoting and fulfilment.
 * Never infer how many fragile glass candles fit: only a measured merchant
 * limit can authorize that quantity.
 */
export type ShippingSize = "small" | "large";
export type ShippingItem = {
  quantity: number;
  price: number;
  weightGrams: number;
  shippingSize?: ShippingSize;
};
export type PackageDimensions = { width: number; height: number; length: number };
export type ShippingPackage = PackageDimensions & { weight: number; insurance_value: number };

function validDimensions(dimensions: PackageDimensions | null | undefined): dimensions is PackageDimensions {
  return !!dimensions && [dimensions.width, dimensions.height, dimensions.length]
    .every(value => Number.isFinite(value) && value > 0 && value <= 200);
}

export function calculateShippingPackage(
  items: ShippingItem[],
  mainBox: PackageDimensions,
  smallBox: PackageDimensions | null,
  maxItems: number,
  packagingWeightGrams: number,
): ShippingPackage {
  if (!validDimensions(mainBox)) {
    throw new Error("Configure as dimensões reais da embalagem na administração.");
  }
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 ||
      !items.length || items.some(item =>
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.weightGrams) || item.weightGrams <= 0 ||
        !Number.isFinite(item.price) || item.price < 0) ||
      items.reduce((sum, item) => sum + item.quantity, 0) > maxItems) {
    throw new Error("Este pedido excede a embalagem configurada para envio. Consulte a Hiraeth.");
  }
  if (!Number.isFinite(packagingWeightGrams) || packagingWeightGrams < 0) {
    throw new Error("Confira o peso da embalagem de envio.");
  }
  // Small box is opt-in only after a physical packing test with protection.
  // Any unrecognised size or mixed order safely falls back to the main box.
  const box = validDimensions(smallBox) &&
    items.every(item => item.shippingSize === "small") ? smallBox : mainBox;
  const productWeight = items.reduce((sum, item) => sum + item.quantity * item.weightGrams, 0);
  const insurance = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const weightKg = Math.max(0.1, (productWeight + packagingWeightGrams) / 1000);
  return {
    width: box.width, height: box.height, length: box.length,
    weight: Math.ceil(weightKg * 1000) / 1000,
    insurance_value: Math.round(insurance * 100) / 100,
  };
}
