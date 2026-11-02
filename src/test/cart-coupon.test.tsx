import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/lib/cart";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        in: () => query,
        then: (resolve: (value: object) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
        maybeSingle: async () => {
          const result = await mocks.lookup();
          return {
            ...result,
            data: result.data
              ? { id: "test-coupon", name: "TESTE", kind: "coupon", ...result.data }
              : null,
          };
        },
      };
      return query;
    },
  },
}));
import { Route } from "@/routes/carrinho";
const Cart = Route.options.component!;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(
    "hiraeth-cart",
    JSON.stringify([
      { productId: "test-product", name: "Vela teste", slug: "teste", price: 100, quantity: 2 },
    ]),
  );
  mocks.lookup.mockResolvedValue({
    data: { discount_type: "percent", discount_value: 10 },
    error: null,
  });
});
afterEach(cleanup);
async function apply() {
  render(
    <CartProvider>
      <Cart />
    </CartProvider>,
  );
  fireEvent.change(await screen.findByRole("textbox", { name: "Cupom de desconto" }), {
    target: { value: "TESTE" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
}
describe("Cart coupon validity after edits", () => {
  it("requires reapplying a coupon after the quantity changes", async () => {
    await apply();
    expect(screen.getByText(/Cupom TESTE/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Vela teste" }));
    expect(screen.queryByText(/Cupom TESTE/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Cupom TESTE/)).toHaveTextContent(/30,00/);
  });
  it("reports a lookup failure and enables trying again", async () => {
    mocks.lookup.mockRejectedValueOnce(new Error("Network unavailable"));
    render(
      <CartProvider>
        <Cart />
      </CartProvider>,
    );
    fireEvent.change(await screen.findByRole("textbox", { name: "Cupom de desconto" }), {
      target: { value: "TESTE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Aplicar cupom" })).toBeEnabled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("ignores a coupon response if the cart changes during validation", async () => {
    let resolveRequest!: (value: object) => void;
    mocks.lookup.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(
      <CartProvider>
        <Cart />
      </CartProvider>,
    );
    fireEvent.change(await screen.findByRole("textbox", { name: "Cupom de desconto" }), {
      target: { value: "TESTE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }));
    expect(screen.getByRole("button", { name: "Finalizar pedido" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Vela teste" }));
    resolveRequest({ data: { discount_type: "percent", discount_value: 10 }, error: null });
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText(/Cupom TESTE/)).not.toBeInTheDocument();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Finalizar pedido" })).toBeEnabled();
  });

  it.each([
    { discount_type: "fixed", discount_value: 25, expected: "25,00" },
    { discount_type: "fixed", discount_value: 250, expected: "200,00" },
    { discount_type: "percent", discount_value: 10, expected: "20,00" },
  ])(
    "preserves existing discount calculation for $discount_type $discount_value",
    async (promotion) => {
      mocks.lookup.mockResolvedValue({ data: promotion, error: null });
      await apply();
      expect(screen.getByText(/Cupom TESTE/)).toHaveTextContent(promotion.expected);
    },
  );

  it.each([
    { min_cart_value: 300 },
    { ends_at: "2000-01-01T00:00:00Z" },
    { starts_at: "2100-01-01T00:00:00Z" },
    { usage_limit: 1, usage_count: 1 },
  ])("rejects an ineligible coupon (%j)", async (condition) => {
    mocks.lookup.mockResolvedValue({
      data: { discount_type: "percent", discount_value: 10, ...condition },
      error: null,
    });
    render(
      <CartProvider>
        <Cart />
      </CartProvider>,
    );
    fireEvent.change(await screen.findByRole("textbox", { name: "Cupom de desconto" }), {
      target: { value: "TESTE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText(/Cupom TESTE/)).not.toBeInTheDocument();
  });

  it("removes the applied coupon without removing the cart items", async () => {
    await apply();
    fireEvent.click(screen.getByText(/Cupom TESTE/).querySelector("button")!);
    expect(screen.queryByText(/Cupom TESTE/)).not.toBeInTheDocument();
    expect(screen.getByText("Vela teste")).toBeInTheDocument();
  });
});
