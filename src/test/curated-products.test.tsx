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

import { CuratedProductGrid } from "@/components/CuratedProductGrid";
type Product = Tables<"products">;
const products = [
  { id: "a", slug: "vela-a", name: "Vela A", images: [], price: 50, sale_price: null, product_badge: null },
  { id: "b", slug: "vela-b", name: "Vela B", images: [], price: 60, sale_price: null, product_badge: null },
  { id: "c", slug: "vela-c", name: "Vela C", images: [], price: 70, sale_price: null, product_badge: null },
] as unknown as Product[];

afterEach(() => { cleanup(); mocks.savedKeys.length = 0; });

describe("Hiraeth featured product sections", () => {
  it("allows selecting products and making one large instead of a normal three-column tile", async () => {
    render(<CuratedProductGrid scope="home" products={products} categories={[]}
      wishlistIds={new Set()} onWishlist={vi.fn()} onSaveProduct={vi.fn()} />);
    expect(screen.getByTestId("curated-product-grid").querySelectorAll("[data-product-size]")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Escolher velas e tamanhos" }));
    const checkbox = screen.getByRole("checkbox", { name: /Vela B/ });
    fireEvent.click(checkbox);
    fireEvent.change(screen.getByRole("combobox", { name: "Tamanho na vitrine: Vela A" }), { target: { value: "large" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar vitrine" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar vitrine" })).not.toBeInTheDocument());
    const grid = screen.getByTestId("curated-product-grid");
    expect(grid.querySelectorAll("[data-product-size]")).toHaveLength(2);
    expect(grid.querySelector('[data-product-size="large"]')).toHaveTextContent("Vela A");
    expect(grid).toHaveClass("grid-cols-3");
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
