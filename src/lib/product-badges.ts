/** Selos de produto com nomes e cores compartilhados entre administração e loja. */
export const PRODUCT_BADGE_OPTIONS = [
  { value: "new", label: "Novidade" },
  { value: "limited", label: "Edição limitada" },
  { value: "bestseller", label: "Mais vendido" },
  { value: "favorite_scent", label: "Aroma Favorito" },
] as const;

export function productBadgeLabel(value: string | null | undefined): string {
  return PRODUCT_BADGE_OPTIONS.find(option => option.value === value)?.label ?? "";
}

export function productBadgeStyle(value: string | null | undefined): string {
  if (value === "limited") return "hiraeth-product-badge--limited";
  if (value === "favorite_scent") return "border border-[#c6a65b] bg-[#5b1d04] text-[#f7efda]";
  return "bg-[#65744d] text-[#f7efda]";
}
