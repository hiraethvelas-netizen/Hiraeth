import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductVariantsEditor } from "./ProductVariantsEditor";
import { variantCombinations, type VariantSetup, type VariantGroup } from "@/lib/product-variants";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({ onApply, onCancel }: {
    onApply: (file: File) => Promise<void>;
    onCancel: () => void;
  }) => <div>
    <p>Prévia de edição da variação</p>
    <button type="button" onClick={() => void onApply(new File(["recorte"], "recorte.webp", { type: "image/webp" }))}>Aplicar recorte</button>
    <button type="button" onClick={onCancel}>Voltar sem alterar</button>
  </div>,
}));

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
    fireEvent.change(screen.getAllByLabelText("Nome da variação")[0]!, { target: { value: "" } });
    fireEvent.change(screen.getAllByLabelText("Nome da variação")[0]!, { target: { value: "Color" } });
    expect(screen.getByLabelText("Preço (R$) — Vermelha / P")).toHaveValue(60);
    const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(rows[0]).toMatchObject({ stock: 7, image: "https://cdn.test/vermelha-p.webp" });
    expect(rows[0].options).toEqual({ Color: "Vermelha", Tamanho: "P" });
  });

  it("keeps the same photo and stock when a size is cleared and renamed", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Opção 1 de Tamanho"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Opção 1 de Tamanho"), { target: { value: "G" } });
    const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(rows[0]).toMatchObject({ price: 60, stock: 7, image: "https://cdn.test/vermelha-p.webp" });
    expect(rows[0].options).toEqual({ Cor: "Vermelha", Tamanho: "G" });
  });

  it("opens the image editor before replacing the variation photo", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar foto" }));
    expect(screen.getByText("Prévia de edição da variação")).toBeInTheDocument();
    const initial = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
    expect(initial[0].image).toBe("https://cdn.test/vermelha-p.webp");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => {
      const rows = JSON.parse(screen.getByTestId("variation-state").textContent ?? "[]");
      expect(rows[0]).toMatchObject({
        price: 60, stock: 7, image: "https://cdn.test/nova.webp",
      });
    });
  });
});
