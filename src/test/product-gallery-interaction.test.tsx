import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { add } = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/lib/cart", () => ({ useCart: () => ({ items: [], add }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ slug: "teste-vela" }),
  }),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  notFound: () => new Error("not found"),
}));
const images = ["/frente.webp", "/lateral.webp", "/250g.webp"];
const variants = [
  { type: "combination", key: "size-100", label: "100 g",
    options: { Peso: "100 g" }, price: 50, stock: 6, sale_price: null, image: images[0] },
  { type: "combination", key: "size-250", label: "250 g",
    options: { Peso: "250 g" }, price: 90, stock: 3, sale_price: null, image: images[2] },
];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: async () => ({ data: [], error: null }),
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: {
            id: "candle", name: "Vela teste", slug: "teste-vela",
            price: 50, stock: 9, status: "published",
            images, variants, description: null,
          }, error: null,
        }),
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/produto.$slug";
const Product = Route.options.component!;

afterEach(cleanup);

describe("product photo gallery", () => {
  it("swipes between existing photos and selects the correct photo for a variation", async () => {
    render(<Product />);
    const gallery = await screen.findByRole("region", {
      name: /Galeria de fotos do produto/,
    });
    Object.defineProperty(gallery, "clientWidth", { configurable: true, value: 320 });
    const scrollTo = vi.fn();
    Object.defineProperty(gallery, "scrollTo", { configurable: true, value: scrollTo });

    expect(gallery.querySelectorAll("img")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "250 g" }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 640, behavior: "smooth" });
    expect(gallery.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText(/3 de 3/)).toBeInTheDocument();

    Object.defineProperty(gallery, "scrollLeft", { configurable: true, value: 320 });
    fireEvent.scroll(gallery);
    await waitFor(() => expect(screen.getByText(/2 de 3/)).toBeInTheDocument());
  });
});
