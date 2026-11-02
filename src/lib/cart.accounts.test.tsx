import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  id: "admin-user" as string | null,
  listener: null as ((event: string, session: { user: { id: string } } | null) => void) | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: auth.id ? { id: auth.id } : null }, error: null }),
      onAuthStateChange: (listener: typeof auth.listener) => {
        auth.listener = listener;
        return { data: { subscription: { unsubscribe: () => { auth.listener = null; } } } };
      },
    },
  },
}));

import { CartProvider, useCart } from "@/lib/cart";

function CartHarness() {
  const cart = useCart();
  return (
    <div>
      <output data-testid="items">{cart.items.map(item => item.name).join(", ")}</output>
      <output data-testid="count">{cart.count}</output>
      <button onClick={() => cart.add({
        productId: "test-new", name: "Vela adicionada", slug: "nova", price: 50,
      })}>Adicionar vela</button>
    </div>
  );
}

const sample = (name: string, quantity: number) =>
  [{ productId: "p", name, slug: "vela", price: 50, quantity }];

beforeEach(() => {
  localStorage.clear();
  auth.id = "admin-user";
  auth.listener = null;
});

afterEach(() => {
  cleanup();
  auth.listener = null;
});

describe("cart scoped to the signed-in account", () => {
  it("never imports the legacy shared cart into either account", async () => {
    localStorage.setItem("hiraeth-cart", JSON.stringify(sample("Carrinho compartilhado", 3)));
    render(<CartProvider><CartHarness /></CartProvider>);
    await waitFor(() => expect(auth.listener).not.toBeNull());
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(screen.getByTestId("items")).not.toHaveTextContent("Carrinho compartilhado");
    act(() => auth.listener?.("SIGNED_IN", { user: { id: "client-user" } }));
    expect(screen.getByTestId("items")).not.toHaveTextContent("Carrinho compartilhado");
    expect(localStorage.getItem("hiraeth-cart")).toContain("Carrinho compartilhado");
  });

  it("keeps admin and client carts separate across session changes and sign-out", async () => {
    localStorage.setItem("hiraeth-cart:v2:admin-user", JSON.stringify(sample("Vela da admin", 3)));
    localStorage.setItem("hiraeth-cart:v2:client-user", JSON.stringify(sample("Vela da cliente", 1)));
    render(<CartProvider><CartHarness /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId("items")).toHaveTextContent("Vela da admin"));
    expect(screen.getByTestId("count")).toHaveTextContent("3");

    act(() => auth.listener?.("SIGNED_IN", { user: { id: "client-user" } }));
    expect(screen.getByTestId("items")).toHaveTextContent("Vela da cliente");
    expect(screen.getByTestId("items")).not.toHaveTextContent("Vela da admin");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar vela" }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("hiraeth-cart:v2:client-user") ?? "[]");
      expect(stored.map((item: { name: string }) => item.name)).toContain("Vela adicionada");
    });

    act(() => auth.listener?.("SIGNED_OUT", null));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("items")).not.toHaveTextContent("Vela da cliente");

    act(() => auth.listener?.("SIGNED_IN", { user: { id: "admin-user" } }));
    expect(screen.getByTestId("items")).toHaveTextContent("Vela da admin");
    expect(screen.getByTestId("items")).not.toHaveTextContent("Vela adicionada");
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(JSON.parse(localStorage.getItem("hiraeth-cart:v2:admin-user") ?? "[]")).toEqual(
      sample("Vela da admin", 3),
    );
  });
});
