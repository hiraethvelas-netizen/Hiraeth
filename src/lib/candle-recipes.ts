import type { VariantSetup } from "@/lib/product-variants";

export type StockUnit = "ml" | "g";
export type CandleIngredient = {
  essence_id: string;
  name: string;
  // Kept for existing drafts and the legacy recipe table. Unit comes from the essence.
  quantity_ml: number;
  stock_unit?: StockUnit;
};
export type VariantRecipes = Record<string, CandleIngredient[]>;

export const essenceUnit = (essence?: { stock_unit?: StockUnit } | null): StockUnit =>
  essence?.stock_unit === "g" ? "g" : "ml";

/** Recipe IDs survive option/group renames, unlike the customer-facing option key. */
export function withRecipeIds(setup: VariantSetup): VariantSetup {
  return {
    ...setup,
    rows: setup.rows.map((row) => ({ ...row, recipe_id: row.recipe_id || crypto.randomUUID() })),
    legacy:
      setup.legacy?.map((row) =>
        row.type === "house"
          ? row
          : {
              ...row,
              recipe_id: typeof row.recipe_id === "string" ? row.recipe_id : crypto.randomUUID(),
            },
      ) ?? null,
  };
}

export function recipeTargets(setup: VariantSetup) {
  const targets = (setup.legacy ?? setup.rows)
    .filter((row) => row.type !== "house" && typeof row.recipe_id === "string")
    .map((row) => ({
      id: String(row.recipe_id),
      label: String(row.label || row.key || "Variação"),
    }));
  return [...new Set(targets.map((target) => target.id))].map((id) => ({
    id,
    label: targets
      .filter((target) => target.id === id)
      .map((target) => target.label)
      .join(" · "),
  }));
}

export function recipePayload(
  defaults: CandleIngredient[],
  recipes: VariantRecipes,
  setup: VariantSetup,
) {
  const ingredients = (items: CandleIngredient[]) =>
    items.map((item) => ({
      essence_id: item.essence_id,
      quantity: item.quantity_ml,
    }));
  return {
    p_default_ingredients: ingredients(defaults),
    p_variant_recipes: recipeTargets(setup)
      .filter((target) => (recipes[target.id]?.length ?? 0) > 0)
      .map((target) => ({ recipe_id: target.id, ingredients: ingredients(recipes[target.id]!) })),
  };
}
