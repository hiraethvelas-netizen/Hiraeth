import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandleEssenceEditor } from "./CandleEssenceEditor";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const stock = [
  { id: "forest", name: "Floresta de Inverno", stock_ml: 80, active: true },
  { id: "vanilla", name: "Baunilha", stock_ml: 250, active: true },
  { id: "champagne", name: "Crisp Champagne", stock_ml: 35, active: true },
];

const create = vi.fn(async (input: { name: string; stock_ml: number }) =>
  ({ id: "new", name: input.name, stock_ml: input.stock_ml, active: true }));
const updateRecipe = vi.fn();
const refresh = vi.fn(async () => undefined);

beforeEach(() => { vi.clearAllMocks(); });

describe("Candle essence stock editor", () => {
  it("searches existing inventory and adds a selected essence to the candle recipe", () => {
    render(<CandleEssenceEditor essences={stock} ingredients={[]}
      onIngredientsChange={updateRecipe} onCreate={create} onRefresh={refresh} />);
    const field = screen.getByPlaceholderText("Ex.: Baunilha, Floresta de Inverno...");
    fireEvent.change(field, { target: { value: "floresta" } });
    expect(screen.getByRole("option", { name: "Floresta de Inverno" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Baunilha" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Floresta de Inverno" }));
    fireEvent.change(screen.getByLabelText("Quantidade (ml)"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
    expect(updateRecipe).toHaveBeenCalledWith([{
      essence_id: "forest", name: "Floresta de Inverno", quantity_ml: 8,
    }]);
  });

  it("registers a new essence from the product editor then returns to inventory", async () => {
    render(<CandleEssenceEditor essences={stock} ingredients={[]}
      onIngredientsChange={updateRecipe} onCreate={create} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole("tab", { name: "+ Cadastrar um aroma novo" }));
    fireEvent.change(screen.getByLabelText("Nome do aroma"), { target: { value: "Canela" } });
    fireEvent.change(screen.getByLabelText("Saldo inicial (ml)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência no estoque" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: "Canela", stock_ml: 40,
    })));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Pesquisar estoque" })).toHaveAttribute("aria-selected", "true"));
  });

  it("keeps a recipe unchanged when the inventory refresh fails", async () => {
    const failing = vi.fn(async () => { throw new Error("Falha na consulta"); });
    render(<CandleEssenceEditor essences={stock} ingredients={[
      { essence_id: "vanilla", name: "Baunilha", quantity_ml: 4 },
    ]} onIngredientsChange={updateRecipe} onCreate={create} onRefresh={failing} />);
    expect(screen.getByText(/4 ml por vela/)).toBeInTheDocument();
    // Parent handles connection errors without losing the currently edited recipe.
    fireEvent.click(screen.getByRole("button", { name: "Atualizar estoque de essências" }));
    await waitFor(() => expect(failing).toHaveBeenCalled());
    expect(updateRecipe).not.toHaveBeenCalled();
  });
});
