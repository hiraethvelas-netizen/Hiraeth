import { describe, expect, it } from "vitest";
import { recipePayload, recipeTargets, withRecipeIds } from "./candle-recipes";
import {
  legacyToManaged,
  reconcileVariantCombinations,
  variantCombinations,
  variantSetupFrom,
} from "./product-variants";

describe("Recipe identity and serialization", () => {
  it("keeps each size recipe when adding colours without copying inventory", () => {
    const setup = withRecipeIds(
      variantSetupFrom(
        [100, 250].map((size) => ({
          type: "combination",
          options: { Tamanho: `${size} g` },
          price: size,
          stock: 7,
        })),
      ),
    );
    const groups = [
      ...setup.groups,
      {
        id: "colour",
        name: "Cor",
        values: [
          { id: "red", label: "Vermelha" },
          { id: "blue", label: "Azul" },
        ],
      },
    ];
    const rows = variantCombinations(groups, setup.rows, 40);
    for (const row of rows) {
      const original = setup.rows.find((old) => old.options["Tamanho"] === row.options["Tamanho"]);
      expect(row.recipe_id).toBe(original?.recipe_id);
      expect(row.stock).toBe(0);
      expect(row.price).toBe(40);
    }
    const recipes = Object.fromEntries(
      setup.rows.map((row, i) => [
        row.recipe_id!,
        [{ essence_id: "e", name: "Baunilha", quantity_ml: i === 0 ? 8 : 20 }],
      ]),
    );
    expect(
      recipePayload([], recipes, { ...setup, groups, rows }).p_variant_recipes.map(
        (recipe) => recipe.ingredients[0]?.quantity,
      ),
    ).toEqual([8, 20]);
  });
  it("keeps the recipe when the merchant renames a size", () => {
    const setup = withRecipeIds(
      variantSetupFrom([
        { type: "combination", options: { Tamanho: "100 g" }, price: 40, stock: 2 },
      ]),
    );
    const next = setup.groups.map((group) => ({
      ...group,
      values: group.values.map((value) => ({ ...value, label: "Pequena 100 g" })),
    }));
    const rows = reconcileVariantCombinations(setup.groups, next, setup.rows, 40);
    expect(rows[0]?.recipe_id).toBe(setup.rows[0]?.recipe_id);
    expect(rows[0]?.options).toEqual({ Tamanho: "Pequena 100 g" });
  });

  it("preserves recipes during explicit legacy size/house conversion and serializes shared IDs once", () => {
    const setup = legacyToManaged(
      [
        {
          type: "size",
          key: "small",
          label: "100 g",
          stock: 2,
          price: 40,
          recipe_id: "small-recipe",
        },
        { type: "house", key: "lion", label: "Leão" },
        { type: "house", key: "eagle", label: "Águia" },
      ],
      40,
    );
    expect(setup.rows.map((row) => row.recipe_id)).toEqual(["small-recipe", "small-recipe"]);
    expect(recipeTargets(setup)).toHaveLength(1);
    expect(
      recipePayload(
        [],
        { "small-recipe": [{ essence_id: "e", name: "Canela", quantity_ml: 8, stock_unit: "g" }] },
        setup,
      ),
    ).toEqual({
      p_default_ingredients: [],
      p_variant_recipes: [
        { recipe_id: "small-recipe", ingredients: [{ essence_id: "e", quantity: 8 }] },
      ],
    });
  });

  it("does not send removed sizes or empty overrides and preserves default quantities", () => {
    expect(
      recipePayload(
        [{ essence_id: "e", name: "Canela", quantity_ml: 3 }],
        {
          removed: [{ essence_id: "e", name: "Canela", quantity_ml: 20 }],
        },
        variantSetupFrom([]),
      ),
    ).toEqual({
      p_default_ingredients: [{ essence_id: "e", quantity: 3 }],
      p_variant_recipes: [],
    });
  });
});
