/** Produtos destacados no portal NFC: até cinco IDs, mantendo outras opções do tema. */
const MAX_FEATURED_PRODUCTS = 5;

export function portalFeaturedProductIds(theme: unknown): string[] {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return [];
  const values = (theme as Record<string, unknown>)["featured_product_ids"];
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((id): id is string =>
    typeof id === "string" && id.trim().length > 0))].slice(0, MAX_FEATURED_PRODUCTS);
}

export function updatePortalFeaturedProducts(theme: unknown, ids: string[]): Record<string, unknown> {
  const previous = theme && typeof theme === "object" && !Array.isArray(theme)
    ? theme as Record<string, unknown> : {};
  return { ...previous, featured_product_ids: [...new Set(ids.filter(id => id.trim()))].slice(0, MAX_FEATURED_PRODUCTS) };
}

export const MAX_PORTAL_FEATURED_PRODUCTS = MAX_FEATURED_PRODUCTS;
