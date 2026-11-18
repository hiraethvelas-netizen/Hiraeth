import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Tables } from "@/integrations/supabase/types";
import { AdminProductList } from "./AdminProductList";

const products = [
  {
    id: "lion",
    name: "Casa do Leão 100 g",
    sku: "LEAO-100",
    category_id: "magic",
    price: 50,
    sale_price: null,
    stock: 5,
    status: "published",
    images: [],
  },
  {
    id: "snake",
    name: "Casa da Serpente 250 g",
    sku: "SP-250",
    category_id: "magic",
    price: 90,
    sale_price: 80,
    stock: 6,
    status: "draft",
    images: [],
  },
  {
    id: "shirt",
    name: "Camiseta",
    sku: "C-1",
    category_id: null,
    price: 70,
    sale_price: null,
    stock: 0,
    status: "archived",
    images: [],
  },
] as unknown as Tables<"products">[];
const categoryLabel = (id: string | null) => (id ? "Livros / Mundo da Magia" : "—");

function Harness({
  rows = products,
  onEdit = vi.fn(),
  onRemove = vi.fn(),
}: {
  rows?: Tables<"products">[];
  onEdit?: (product: Tables<"products">) => void;
  onRemove?: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <AdminProductList
      products={rows}
      search={search}
      onSearchChange={setSearch}
      categoryLabel={categoryLabel}
      loading={false}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  );
}

describe("Admin product search and readable list", () => {
  it("keeps rows, focus and the search field available while refreshing loaded products", () => {
    const props = {
      products,
      search: "leao",
      onSearchChange: vi.fn(),
      categoryLabel,
      onEdit: vi.fn(),
      onRemove: vi.fn(),
    };
    const { rerender } = render(<AdminProductList {...props} loading={false} />);
    const edit = screen.getByRole("button", { name: "Editar Casa do Leão 100 g" });
    edit.focus();
    rerender(<AdminProductList {...props} loading />);
    expect(edit.isConnected).toBe(true);
    expect(edit).toHaveFocus();
    expect(screen.getByText("Casa do Leão 100 g")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 3 produto(s) · Atualizando...");
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });

  it("finds names without accents or case, retains every product and clears the search", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar velas e produtos" }), {
      target: { value: "  LEAO  " },
    });
    expect(screen.getByText("Casa do Leão 100 g")).toBeInTheDocument();
    expect(screen.queryByText("Casa da Serpente 250 g")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(screen.getByText("Casa da Serpente 250 g")).toBeInTheDocument();
    expect(screen.getByText("Camiseta")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 de 3");
  });

  it("searches SKU and category and keeps the existing stock threshold, prices and actions", () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    render(<Harness onEdit={onEdit} onRemove={onRemove} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "sp-250" } });
    const row = screen.getByText("Casa da Serpente 250 g").closest("tr")!;
    expect(within(row).getByText(/80,00/)).toBeInTheDocument();
    expect(within(row).getByText("6")).toBeInTheDocument();
    expect(within(row).queryByText(/Baixo/)).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Editar Casa da Serpente 250 g" }));
    expect(onEdit).toHaveBeenCalledWith(products[1]);
    fireEvent.click(within(row).getByRole("button", { name: "Remover Casa da Serpente 250 g" }));
    expect(onRemove).toHaveBeenCalledWith("snake", "Casa da Serpente 250 g");
    fireEvent.change(search, { target: { value: "livros magia" } });
    expect(screen.getByRole("status")).toHaveTextContent("2 de 3");
    expect(screen.getByText("5 · Baixo")).toBeInTheDocument();
    expect(screen.queryByText("Camiseta")).not.toBeInTheDocument();
  });

  it("distinguishes an empty search from an empty catalog without modifying records", () => {
    const onRemove = vi.fn();
    const { unmount } = render(<Harness onRemove={onRemove} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "não existe" } });
    expect(screen.getByText("Nenhum produto encontrado para essa pesquisa.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum produto cadastrado ainda.")).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
    unmount();
    render(<Harness rows={[]} />);
    expect(screen.getByText("Nenhum produto cadastrado ainda.")).toBeInTheDocument();
  });
});
