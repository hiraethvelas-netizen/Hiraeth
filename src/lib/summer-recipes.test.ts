import { describe, expect, it } from "vitest";
import { defaultSummerRecipes, summerRecipesFromTheme } from "./summer-recipes";

describe("summer recipes", () => {
  it("offers the four seasonal Hiraeth recipes when the portal has blank draft slots", () => {
    const slots = Array.from({ length: 4 }, () => ({
      title: "", ingredients: "", method: "", image_url: "", visible: false,
    }));
    const recipes = summerRecipesFromTheme({ recipes: slots });
    expect(recipes).toEqual(defaultSummerRecipes);
    expect(recipes).toHaveLength(4);
    expect(recipes.map(item => item.visible)).toEqual([true, true, true, true]);
  });

  it("uses admin-edited recipes in preference to the initial curation", () => {
    const custom = { title: "Minha receita", ingredients: "Limão", method: "Misture", image_url: "", visible: true };
    expect(summerRecipesFromTheme({ recipes: [custom] })).toEqual([custom]);
  });

  it("never re-publishes recipes explicitly hidden by the administrator", () => {
    const hidden = { title: "", ingredients: "", method: "", image_url: "", visible: false };
    expect(summerRecipesFromTheme({ recipes_configured: true, recipes: [hidden] })).toEqual([hidden]);
  });

  it("does not depend on the catalog visibility setting", () => {
    const recipes = summerRecipesFromTheme({ show_catalog: false, recipes: [] });
    expect(recipes).toHaveLength(4);
  });
});
