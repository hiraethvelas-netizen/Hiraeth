import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CartProvider } from "@/lib/cart";
const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  navigate: vi.fn(),
  failed: false,
  promotions: [
    {
      id: "discount",
      name: "Desconto automático",
      kind: "automatic_discount",
      active: true,
      visible: true,
      all_products: false,
      eligible_category_ids: ["hp"],
      discount_type: "percent",
      discount_value: 20,
    },
    {
      id: "shipping",
      name: "Frete",
      kind: "free_shipping",
      active: true,
      visible: true,
      all_products: true,
    },
    {
      id: "gift",
      name: "Brinde",
      kind: "gift",
      active: true,
      visible: true,
      all_products: true,
      gift_name: "Marcador",
    },
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user", email: "user@example.test" } } }),
    },
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        neq: () => q,
        in: () => q,
        insert: (payload: unknown) => {
          mocks.insert(table, payload);
          return q;
        },
        single: async () => ({ data: { id: "order" }, error: null }),
        then: (resolve: (result: object) => unknown) =>
          Promise.resolve({
            data:
              table === "promotions"
                ? mocks.promotions
                : table === "categories"
                  ? [{ id: "hp", parent_id: null }]
                  : table === "products"
                    ? [{ id: "test", category_id: "hp", stock: 10 }]
                    : [],
            error: mocks.failed && table === "promotions" ? { message: "Read refused" } : null,
          }).then(resolve),
      };
      return q;
    },
  },
}));
import { Route } from "@/routes/carrinho";
const Cart = Route.options.component!;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.failed = false;
  localStorage.clear();
  localStorage.setItem(
    "hiraeth-cart",
    JSON.stringify([
      { productId: "test", name: "Vela teste", slug: "vela", quantity: 2, price: 20 },
    ]),
  );
});
afterEach(cleanup);
it("calculates automatic benefits and includes gifts and free shipping in the simulated order", async () => {
  render(
    <CartProvider>
      <Cart />
    </CartProvider>,
  );
  expect(await screen.findByText("Brinde: Marcador")).toBeInTheDocument();
  expect(screen.getByText("Frete grátis aplicado.")).toBeInTheDocument();
  const checkout = screen.getByRole("button", { name: "Finalizar pedido" });
  await waitFor(() => expect(checkout).toBeEnabled());
  fireEvent.click(checkout);
  await waitFor(() =>
    expect(mocks.insert).toHaveBeenCalledWith(
      "orders",
      expect.objectContaining({
        subtotal: 40,
        discount: 8,
        total: 32,
        shipping: 0,
        promotion_summary: expect.objectContaining({ free_shipping: true, gifts: ["Marcador"] }),
      }),
    ),
  );
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/pedidos" }));
  expect(mocks.insert).toHaveBeenCalledWith(
    "order_items",
    expect.arrayContaining([expect.objectContaining({ product_id: "test", quantity: 2 })]),
  );
});
it("blocks finalization and offers retry if promotions cannot be checked", async () => {
  mocks.failed = true;
  render(
    <CartProvider>
      <Cart />
    </CartProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível verificar as promoções",
  );
  expect(screen.getByRole("button", { name: "Finalizar pedido" })).toBeDisabled();
  mocks.failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Finalizar pedido" })).toBeEnabled(),
  );
  expect(mocks.insert).not.toHaveBeenCalled();
});
