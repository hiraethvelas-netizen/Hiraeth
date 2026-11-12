import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ products: [] as Record<string, unknown>[] }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params }: { children: ReactNode; params?: { slug: string } }) =>
    <a href={params ? "/produto/" + params.slug : "#"}>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: async () => ({ data: mock.products, error: null }),
      };
      return query;
    },
  },
}));

import { RelatedProducts, chooseRelatedProducts } from "@/components/RelatedProducts";

const recommendation = (id: string, category: string, stock = 5) => ({
  id, slug: "vela-" + id, name: "Vela " + id, category_id: category, stock,
  images: ["/" + id + ".webp"], price: 50, sale_price: null,
});

afterEach(cleanup);

describe("Outras Chamas para Descobrir", () => {
  it("prioritizes the same literary universe, excludes the current candle and sold-out products", () => {
    const inventory = [
      recommendation("other", "different"),
      recommendation("same", "harry-potter"),
      recommendation("current", "harry-potter"),
      recommendation("sold-out", "harry-potter", 0),
      recommendation("same-2", "harry-potter"),
    ];
    const selected = chooseRelatedProducts(inventory, { id: "current", category_id: "harry-potter" }, 3);
    expect(selected.map(item => item.id)).toEqual(["same", "same-2", "other"]);
  });

  it("renders clickable product recommendations with image, name and price", async () => {
    mock.products = [
      recommendation("another", "other"),
      recommendation("same", "harry-potter"),
      recommendation("current", "harry-potter"),
    ];
    render(<RelatedProducts product={{ id: "current", category_id: "harry-potter" }} />);
    const section = await screen.findByRole("region", { name: "Outras Chamas para Descobrir" });
    expect(section).toHaveTextContent("Uma história leva à outra");
    const related = screen.getByTestId("related-products");
    expect(related).toHaveClass("overflow-x-auto", "snap-x", "snap-mandatory");
    expect(related).toHaveAttribute("tabindex", "0");
    await waitFor(() => expect(related.querySelectorAll("a")).toHaveLength(2));
    expect(related.querySelectorAll("a")[0]).toHaveAttribute("href", "/produto/vela-same");
    expect(screen.queryByText("Vela current")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Vela same" })).toHaveAttribute("src", "/same.webp");
  });

  it("does not show an empty recommendation area if no other published product is available", () => {
    mock.products = [recommendation("current", "harry-potter")];
    const { container } = render(<RelatedProducts product={{ id: "current", category_id: "harry-potter" }} />);
    expect(container.querySelector("section")).toBeNull();
  });
});
