import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  products: [
    { id: "a", slug: "vela-a", name: "Vela A", product_type: "candle", images: ["/vela-a.png"], status: "published" },
    { id: "b", slug: "vela-b", name: "Vela B", product_type: "candle", images: ["/vela-b.png"], status: "published" },
    { id: "c", slug: "vela-c", name: "Vela C", product_type: "candle", images: ["/vela-c.png"], status: "published" },
    { id: "d", slug: "vela-d", name: "Vela D", product_type: "candle", images: ["/vela-d.png"], status: "published" },
    { id: "e", slug: "vela-e", name: "Vela E", product_type: "candle", images: ["/vela-e.png"], status: "published" },
    { id: "shirt", slug: "shirt", name: "Camiseta", product_type: "artifact", images: [], status: "published" },
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, ...props }: { children: ReactNode; params?: { slug: string }; [key: string]: unknown }) =>
    <a {...props} href={"/produto/" + params?.slug}>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: async () => ({ data: mocks.products, error: null }),
      };
      return query;
    },
  },
}));
import { PortalFeaturedProducts } from "@/components/PortalFeaturedProducts";

afterEach(cleanup);

describe("Carrossel de velas publicadas do Portal NFC", () => {
  it("mostra cinco velas no retângulo, navegando diretamente para cada produto", async () => {
    render(<PortalFeaturedProducts theme={{}} />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Conhecer vela/ })).toHaveLength(5));
    expect(screen.getByRole("region", { name: "Velas do Acervo para deslizar horizontalmente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer vela Vela A" })).toHaveAttribute("href", "/produto/vela-a");
    expect(screen.queryByRole("link", { name: /Camiseta/ })).not.toBeInTheDocument();
  });

  it("respeita a ordem escolhida e não adiciona produtos além dos selecionados", async () => {
    render(<PortalFeaturedProducts theme={{ featured_product_ids: ["e", "b"] }} />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Conhecer vela/ })).toHaveLength(2));
    const links = screen.getAllByRole("link", { name: /Conhecer vela/ });
    expect(links[0]).toHaveAttribute("href", "/produto/vela-e");
    expect(links[1]).toHaveAttribute("href", "/produto/vela-b");
  });
});
