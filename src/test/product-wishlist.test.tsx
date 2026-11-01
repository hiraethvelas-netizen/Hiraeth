import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  add: vi.fn(),
  saved: false,
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/lib/cart", () => ({ useCart: () => ({ add: mocks.add }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, info: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ slug: "vela-teste" }),
  }),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  notFound: () => new Error("not found"),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "test-user" } } }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data:
            table === "products"
              ? {
                  id: "test-product",
                  slug: "vela-teste",
                  name: "Vela teste",
                  images: [],
                  variants: [],
                  price: 50,
                  stock: 2,
                }
              : mocks.saved
                ? { id: "test-wishlist" }
                : null,
        }),
        insert: mocks.mutation,
        delete: () => ({ eq: () => ({ eq: mocks.mutation }) }),
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/produto.$slug";
const ProductPage = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.saved = false;
});
afterEach(cleanup);

describe("Product wishlist button", () => {
  it.each([false, true])(
    "keeps saved state %s when the database refuses the change",
    async (saved) => {
      mocks.saved = saved;
      mocks.mutation.mockResolvedValue({ error: { message: "database refused" } });
      render(<ProductPage />);
      const label = saved ? "♥ Nos seus desejos" : "♡ Adicionar aos desejos";
      fireEvent.click(await screen.findByRole("button", { name: label }));
      await waitFor(() => expect(mocks.error).toHaveBeenCalled());
      expect(mocks.success).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: label })).toBeEnabled();
    },
  );

  it("adds and removes a wish only after database success", async () => {
    mocks.mutation.mockResolvedValue({ error: null });
    render(<ProductPage />);
    fireEvent.click(await screen.findByRole("button", { name: "♡ Adicionar aos desejos" }));
    fireEvent.click(await screen.findByRole("button", { name: "♥ Nos seus desejos" }));
    await screen.findByRole("button", { name: "♡ Adicionar aos desejos" });
    expect(mocks.mutation).toHaveBeenCalledTimes(2);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("blocks a second click while saving and recovers after a network failure", async () => {
    let rejectRequest!: (reason: Error) => void;
    mocks.mutation.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    render(<ProductPage />);
    const button = await screen.findByRole("button", { name: "♡ Adicionar aos desejos" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
    rejectRequest(new Error("network unavailable"));
    await waitFor(() => expect(button).toBeEnabled());
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
