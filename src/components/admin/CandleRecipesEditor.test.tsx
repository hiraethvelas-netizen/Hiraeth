import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandleRecipesEditor } from "./CandleRecipesEditor";
import { type CandleIngredient, type VariantRecipes } from "@/lib/candle-recipes";
import { variantSetupFrom } from "@/lib/product-variants";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const rows = [100, 250].map((weight) => ({
  key: `size-${weight}`,
  type: "combination",
  label: `${weight} g`,
  options: { Tamanho: `${weight} g` },
  recipe_id: `recipe-${weight}`,
  price: weight,
  stock: 3,
  image: "",
  sale_price: null,
}));
const stock = [
  { id: "vanilla", name: "Baunilha", stock_ml: 100, stock_unit: "g" as const, active: true },
];

function Harness() {
  const [ingredients, setIngredients] = useState<CandleIngredient[]>([]);
  const [recipes, setRecipes] = useState<VariantRecipes>({});
  return (
    <>
      <CandleRecipesEditor
        variants={variantSetupFrom(rows)}
        essences={stock}
        ingredients={ingredients}
        onIngredientsChange={setIngredients}
        variantRecipes={recipes}
        onVariantRecipesChange={setRecipes}
        onCreate={vi.fn()}
        onRefresh={vi.fn()}
      />
      <output aria-label="Saved draft">{JSON.stringify({ ingredients, recipes })}</output>
    </>
  );
}

function add(quantity: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Pesquisar aroma no estoque" }), {
    target: { value: "Baunilha" },
  });
  fireEvent.click(screen.getByRole("option", { name: "Baunilha" }));
  fireEvent.change(screen.getByLabelText("Quantidade (g)"), { target: { value: quantity } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
}

describe("Recipes per candle size", () => {
  it("keeps 8 g for the 100 g candle and 20 g for 250 g while switching sizes", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Receita para"), { target: { value: "recipe-100" } });
    add("8");
    expect(screen.getByText(/8 g por vela/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Receita para"), { target: { value: "recipe-250" } });
    expect(screen.queryByText(/8 g por vela/)).not.toBeInTheDocument();
    add("20");
    fireEvent.change(screen.getByLabelText("Receita para"), { target: { value: "recipe-100" } });
    expect(screen.getByText(/8 g por vela/)).toBeInTheDocument();
    expect(screen.queryByText(/20 g por vela/)).not.toBeInTheDocument();
    const draft = JSON.parse(screen.getByLabelText("Saved draft").textContent!);
    expect(draft.ingredients).toEqual([]);
    expect(draft.recipes["recipe-100"][0]).toMatchObject({
      essence_id: "vanilla",
      quantity_ml: 8,
      stock_unit: "g",
    });
    expect(draft.recipes["recipe-250"][0]).toMatchObject({
      essence_id: "vanilla",
      quantity_ml: 20,
      stock_unit: "g",
    });
  });

  it("states default inheritance and only resets a specific recipe after confirmation", () => {
    render(<Harness />);
    add("5");
    fireEvent.change(screen.getByLabelText("Receita para"), { target: { value: "recipe-100" } });
    expect(screen.getByRole("status", { name: "Receita selecionada" })).toHaveTextContent(
      "100 g usa a receita padrão",
    );
    add("8");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Usar receita padrão neste tamanho" }));
    expect(screen.getByText(/8 g por vela/)).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Usar receita padrão neste tamanho" }));
    expect(screen.getByRole("status", { name: "Receita selecionada" })).toHaveTextContent(
      "100 g usa a receita padrão",
    );
    expect(screen.getByText(/Receita padrão atual: Baunilha: 5 g/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Receita para"), { target: { value: "" } });
    expect(
      within(screen.getByRole("region", { name: "Aromas da vela" })).getByText(/5 g por vela/),
    ).toBeInTheDocument();
    confirm.mockRestore();
  });
});
