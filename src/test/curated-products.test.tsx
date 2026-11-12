import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/integrations/supabase/types";

const mocks = vi.hoisted(() => ({ savedKeys: [] as string[] }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, ...props }: { children: ReactNode; params?: { slug: string }; [key: string]: unknown }) =>
    <a {...props} href={params ? "/produto/" + params.slug : "#"}>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/InlineEditor", () => ({ InlineEditor: () => null }));
vi.mock("@/lib/admin-edit", async () => {
  const { useState } = await import("react");
  return {
    useAdminEdit: () => ({ isAdmin: true, editMode: true }),
    useSiteContent: (key: string, defaults: object) => {
      mocks.savedKeys.push(key);
      return useState(defaults);
    },
  };
});

import { CuratedProductGrid, reorderPublishedProducts } from "@/components/CuratedProductGrid";
type Product = Tables<"products">;
const products = [
  { id: "a", slug: "vela-a", name: "Vela A", images: [], price: 50, sale_price: null, product_badge: null },
  { id: "b", slug: "vela-b", name: "Vela B", images: [], price: 60, sale_price: null, product_badge: null },
  { id: "c", slug: "vela-c", name: "Vela C", images: [], price: 70, sale_price: null, product_badge: null },
] as unknown as Product[];

afterEach(() => { cleanup(); mocks.savedKeys.length = 0; });

describe("Hiraeth featured product sections", () => {
  it("allows selecting products and making one large instead of a normal two-column tile", async () => {
    render(<CuratedProductGrid scope="home" products={products} categories={[]}
      wishlistIds={new Set()} onWishlist={vi.fn()} onSaveProduct={vi.fn()} />);
    expect(screen.getByTestId("curated-product-grid").querySelectorAll("[data-product-size]")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Personalizar destaques" }));
    const checkbox = screen.getByRole("checkbox", { name: /Vela B/ });
    fireEvent.click(checkbox);
    fireEvent.change(screen.getByRole("combobox", { name: "Tamanho na vitrine: Vela A" }), { target: { value: "large" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar vitrine" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar vitrine" })).not.toBeInTheDocument());
    const grid = screen.getByTestId("curated-product-grid");
    expect(grid.querySelectorAll("[data-product-size]")).toHaveLength(2);
    expect(grid.querySelector('[data-product-size="large"]')).toHaveTextContent("Vela A");
    expect(grid.querySelector('[data-product-size="large"]')).toHaveClass("col-span-2", "items-center");
    expect(grid.querySelector('[data-product-size="large"] .hiraeth-product-card')).toHaveClass("mx-auto", "max-w-lg");
    expect(grid).toHaveClass("grid-cols-2");
  });

  it("lets the admin adjust a candle from two-per-row to large and back directly", async () => {
    render(<CuratedProductGrid scope="home" products={products} categories={[]}
      wishlistIds={new Set()} onWishlist={vi.fn()} onSaveProduct={vi.fn()} />);
    const grid = screen.getByTestId("curated-product-grid");
    expect(grid.querySelector('[data-product-size="large"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Exibir Vela A grande" }));
    await waitFor(() => expect(grid.querySelector('[data-product-size="large"]')).toHaveTextContent("Vela A"));
    expect(screen.getByRole("button", { name: "Exibir Vela A grande" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Exibir Vela A em fileira de duas" }));
    await waitFor(() => expect(grid.querySelector('[data-product-size="large"]')).not.toBeInTheDocument());
    expect(grid.querySelectorAll('[data-product-size="normal"]')).toHaveLength(3);
  });


  it("reorders published candles by touch and saves the new display order", async () => {
    render(<CuratedProductGrid scope="house-leao" products={products} categories={[]}
      wishlistIds={new Set()} onWishlist={vi.fn()} onSaveProduct={vi.fn()} />);
    const grid = screen.getByTestId("curated-product-grid");
    const ids = () => Array.from(grid.querySelectorAll<HTMLElement>("[data-curation-product-id]"))
      .map(node => node.dataset.curationProductId);
    expect(ids()).toEqual(["a", "b", "c"]);
    const handle = screen.getByRole("button", { name: /Segure e arraste Vela A/ });
    const target = grid.querySelector('[data-curation-product-id="c"]')!;
    const originalHitTest = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => target });
    try {
      fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch", button: 0, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(handle, { pointerId: 1, pointerType: "touch", clientX: 80, clientY: 120 });
      fireEvent.pointerUp(handle, { pointerId: 1, pointerType: "touch", clientX: 80, clientY: 120 });
      await waitFor(() => expect(ids()).toEqual(["b", "c", "a"]));
    } finally {
      Object.defineProperty(document, "elementFromPoint", { configurable: true, value: originalHitTest });
    }
  });

  it("preserves the display size when the order changes", () => {
    expect(reorderPublishedProducts([
      { id: "a", size: "normal" }, { id: "b", size: "large" }, { id: "c", size: "normal" },
    ], ["c", "a", "b"])).toEqual([
      { id: "c", size: "normal" }, { id: "a", size: "normal" }, { id: "b", size: "large" },
    ]);
  });

  it("places limited-edition badges below product imagery", () => {
    const limited = [{ ...products[0], product_badge: "limited" } as Product];
    render(<CuratedProductGrid scope="limited" products={limited} categories={[]}
      wishlistIds={new Set()} onWishlist={vi.fn()} onSaveProduct={vi.fn()} />);
    const badge = screen.getByText("Edição limitada");
    expect(badge.closest(".hiraeth-product-visual")).toBeNull();
    expect(screen.getByTestId("curated-product-grid")).toHaveClass("grid-cols-2");
  });

  it("keeps home, category and subcategory vitrine settings in separate storage keys", () => {
    const props = { products, categories: [], wishlistIds: new Set<string>(),
      onWishlist: vi.fn(), onSaveProduct: vi.fn() };
    const { unmount } = render(<CuratedProductGrid scope="home" {...props} />);
    unmount();
    const second = render(<CuratedProductGrid scope="category-1" {...props} />);
    second.unmount();
    render(<CuratedProductGrid scope="subcategory-2" {...props} />);
    expect(mocks.savedKeys).toContain("store-curation-home");
    expect(mocks.savedKeys).toContain("store-curation-category-1");
    expect(mocks.savedKeys).toContain("store-curation-subcategory-2");
  });
});
