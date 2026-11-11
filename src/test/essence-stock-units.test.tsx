import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  conflict: false,
  error: vi.fn(),
  copy: vi.fn(async () => undefined),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.error, info: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string, payload: object) => {
      mocks.rpc(name, payload);
      return { data: { stock_ml: 112, stock_unit: "g" }, error: null };
    },
    from: (table: string) => {
      const data: Record<string, object[]> = {
        essences: [
          {
            id: "e1",
            name: "Baunilha",
            stock_ml: 100,
            stock_unit: "g",
            minimum_stock_ml: 10,
            target_stock_ml: 200,
            is_pure: true,
            active: true,
          },
          {
            id: "e2",
            name: "Canela",
            stock_ml: 50,
            minimum_stock_ml: 10,
            target_stock_ml: 80,
            is_pure: true,
            active: true,
          },
        ],
        products: [
          {
            id: "p1",
            name: "Casa do Leão",
            stock: 2,
            variants: [
              { recipe_id: "r100", label: "100 g" },
              { recipe_id: "r250", label: "250 g" },
            ],
          },
        ],
        product_essences: [],
        product_variant_essences: [
          { product_id: "p1", recipe_id: "r100", essence_id: "e1", quantity: 8 },
          { product_id: "p1", recipe_id: "r250", essence_id: "e1", quantity: 20 },
        ],
      };
      let writing = false;
      let single = false;
      const query = {
        select: () => query,
        order: () => query,
        eq: (column: string, value: unknown) => {
          mocks.eq(table, column, value);
          return query;
        },
        maybeSingle: () => {
          single = true;
          return query;
        },
        insert: (payload: object) => {
          mocks.mutation(table, "insert", payload);
          return query;
        },
        update: (payload: object) => {
          writing = true;
          mocks.mutation(table, "update", payload);
          return query;
        },
        then: (resolve: (value: object) => unknown) =>
          Promise.resolve({
            data: writing && single ? (mocks.conflict ? null : { id: "e1" }) : (data[table] ?? []),
            error: null,
          }).then(resolve),
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/admin/essencias";
const Essences = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.conflict = false;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.copy },
  });
});

describe("Essence inventory units", () => {
  it("registers grams explicitly without converting the entered balance", async () => {
    render(<Essences />);
    await screen.findByText("Baunilha", { selector: "p" });
    expect(screen.getByText("Unidade do estoque:", { exact: false })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da essência"), { target: { value: "Lavanda" } });
    fireEvent.change(screen.getByLabelText("Saldo atual (g)"), { target: { value: "125.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "essences",
        "insert",
        expect.objectContaining({ name: "Lavanda", stock_ml: 125.5, stock_unit: "g" }),
      ),
    );
  });

  it("shows each size recipe in grams and records a purchase in the same unit", async () => {
    render(<Essences />);
    expect(await screen.findByText("8 g por vela · 100 g")).toBeInTheDocument();
    expect(screen.getByText("20 g por vela · 250 g")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Editar no produto" })).toHaveLength(2);
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("12");
    fireEvent.click(screen.getByRole("button", { name: "+ Registrar compra" }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("record_essence_stock_movement", {
        p_essence_id: "e1",
        p_movement_type: "purchase",
        p_quantity: 12,
        p_expected_balance: null,
      }),
    );
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(prompt).toHaveBeenCalledWith("Quantos g entraram na compra?");
    prompt.mockRestore();
  });

  it("preserves the unit of an existing essence and labels the shopping list correctly", async () => {
    render(<Essences />);
    await screen.findByText("Baunilha", { selector: "p" });
    fireEvent.click(screen.getByRole("button", { name: "Editar cadastro" }));
    expect(screen.getByRole("dialog", { name: "Editar essência" })).toBeInTheDocument();
    expect(screen.getByText("Unidade do estoque:", { exact: false })).toHaveTextContent("g");
    expect(screen.getByLabelText("Saldo atual (g)")).toHaveValue(100);
    fireEvent.click(screen.getByRole("button", { name: "Copiar lista" }));
    await waitFor(() =>
      expect(mocks.copy).toHaveBeenCalledWith(
        expect.stringContaining("Baunilha: 100 g restantes — comprar 100 g"),
      ),
    );
    expect(mocks.copy).toHaveBeenCalledWith(
      expect.stringContaining("Canela: 50 ml restantes — comprar 30 ml"),
    );
  });
  it("does not overwrite the stock when only the essence name is edited", async () => {
    render(<Essences />);
    await screen.findByText("Baunilha", { selector: "p" });
    fireEvent.click(screen.getByRole("button", { name: "Editar cadastro" }));
    fireEvent.change(screen.getByLabelText("Nome da essência"), {
      target: { value: "Baunilha pura" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "essences",
        "update",
        expect.objectContaining({ name: "Baunilha pura" }),
      ),
    );
    const payload = mocks.mutation.mock.calls.find(
      (call) => call[0] === "essences" && call[1] === "update",
    )?.[2];
    expect(payload).not.toHaveProperty("stock_ml");
    expect(payload).not.toHaveProperty("stock_unit");
  });

  it("keeps the edit open when an explicit balance change conflicts with a newer stock", async () => {
    render(<Essences />);
    await screen.findByText("Baunilha", { selector: "p" });
    fireEvent.click(screen.getByRole("button", { name: "Editar cadastro" }));
    fireEvent.change(screen.getByLabelText("Saldo atual (g)"), { target: { value: "120" } });
    mocks.conflict = true;
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("O saldo mudou")),
    );
    expect(mocks.eq).toHaveBeenCalledWith("essences", "stock_ml", 100);
    expect(screen.getByLabelText("Saldo atual (g)")).toHaveValue(120);
  });
});
