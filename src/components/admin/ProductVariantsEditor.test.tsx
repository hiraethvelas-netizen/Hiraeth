import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductVariantsEditor } from "./ProductVariantsEditor";
import { variantCombinations, type VariantSetup, type VariantGroup } from "@/lib/product-variants";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const groups: VariantGroup[] = [
  { id: "color", name: "Cor", values: [{ id: "red", label: "Vermelha" }] },
  { id: "size", name: "Tamanho", values: [{ id: "small", label: "P" }] },
];

function Harness() {
  const [setup, setSetup] = useState<VariantSetup>({
    groups,
    rows: variantCombinations(groups, [], 60).map(row =>
      ({ ...row, price: 60, stock: 7, image: "https://cdn.test/vermelha-p.webp" })),
    legacy: null,
  });
  return (
    <>
      <ProductVariantsEditor value={setup} onChange={setSetup} basePrice={60}
        onUpload={vi.fn(async () => "https://cdn.test/nova.webp")} />
      <output data-testid="variation-state">{JSON.stringify(setup.rows)}</output>
    </>
  );
}

describe("editing existing product variations", () => {
  it("does not hide or erase combinations while clearing and retyping the price", () => {
    render(<Harness />);
    const price = screen.getByLabelText("Preço (R$) — Vermelha / P");
    expect(screen.getByLabelText("Estoque — Vermelha / P")).toHaveValue(7);
    fireEvent.change(price, { target: { value: "" } });
    expect(screen.getByLabelText("Preço (R$) — Vermelha / P")).toBeInTheDocument();
    expect(screen.getByLabelText("Estoque — Vermelha / P")).toHaveValue(7);
    fireEvent.change(screen.getByLabelText("Preço (R$) — Vermelha / P"), { target: { value: "72" } });
    expect(screen.getByLabelText("Preço (R$) — Vermelha / P")).toHaveValue(72);
    const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(rows[0]).toMatchObject({
      price: 72, stock: 7, image: "https://cdn.test/vermelha-p.webp",
    });
  });

  it("allows empty stock during editing without losing price or image", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Estoque — Vermelha / P"), { target: { value: "" } });
    expect(screen.getByLabelText("Estoque — Vermelha / P")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Estoque — Vermelha / P"), { target: { value: "12" } });
    const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(rows[0]).toMatchObject({
      price: 60, stock: 12, image: "https://cdn.test/vermelha-p.webp",
    });
  });

  it("preserves variation values when correcting the group label", () => {
    render(<Harness />);
    fireEvent.change(screen.getAllByLabelText("Nome da variação")[0]!, { target: { value: "Color" } });
    expect(screen.getByLabelText("Preço (R$) — Vermelha / P")).toHaveValue(60);
    const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(rows[0]).toMatchObject({ stock: 7, image: "https://cdn.test/vermelha-p.webp" });
    expect(rows[0].options).toEqual({ Color: "Vermelha", Tamanho: "P" });
  });
});
