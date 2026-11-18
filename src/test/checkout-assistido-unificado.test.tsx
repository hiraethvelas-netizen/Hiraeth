import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteHeader: () => null,
  SiteFooter: () => null,
}));
vi.mock("@/lib/cart", () => ({
  useCart: () => ({
    items: [{
      productId: "vela-1", slug: "vela-de-natal", variantKey: "100g",
      name: "Surpresa de Natal", quantity: 1, price: 50,
      variantDetails: { size: "100 g" },
    }],
    total: 50,
  }),
}));
vi.mock("@/integrations/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: { whatsapp_number: "5547999991234" }, error: null }),
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { email: "cliente@example.test", user_metadata: {} } }, error: null }) },
      from: () => query,
    },
  };
});

import { ManualOrderCheckout } from "@/components/ManualOrderCheckout";

afterEach(cleanup);

describe("Checkout assistido da Hiraeth", () => {
  it("apresenta a mensagem curta, os campos do pedido e somente o botão WhatsApp", async () => {
    render(<ManualOrderCheckout />);
    expect(screen.getByText("A área de checkout ainda está em desenvolvimento. Preencha seus dados e prossiga pelo WhatsApp.")).toBeInTheDocument();
    expect(screen.getByText("Surpresa de Natal", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Seus dados de entrega")).toBeInTheDocument();
    expect(screen.getByText("É para presente")).toBeInTheDocument();
    expect(screen.getByText(/Recado para a Guardiã da Chama/)).toBeInTheDocument();
    expect(screen.getByText(/Cupom para conferência/)).toBeInTheDocument();
    expect(screen.getByText(/Como prefere pagar/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Seguir pelo WhatsApp" })).toBeInTheDocument();
    expect(screen.queryByText(/Ambiente de testes: você pode simular frete/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Conferir e escolher o pagamento/ })).not.toBeInTheDocument();
  });

  it("a rota pública do checkout usa o mesmo formulário para cliente e administradora", () => {
    const source = readFileSync("src/routes/checkout.tsx", "utf8");
    expect(source).toContain("component: CheckoutEntry");
    const entry = source.match(/function CheckoutEntry\(\) \{([\s\S]*?)\n\}/)?.[1];
    expect(entry).toContain("return <ManualOrderCheckout />;");
    expect(entry).not.toMatch(/role|admin|CheckoutHiraeth/);
  });
});
