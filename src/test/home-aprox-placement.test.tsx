import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ children, to, ...props }: { children: ReactNode; to: string; [key: string]: unknown }) =>
    <a href={to} {...props}>{children}</a>,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteHeader: () => <header>Menu Hiraeth</header>,
  SiteFooter: () => <footer>Rodapé Hiraeth</footer>,
}));
vi.mock("@/components/CinematicOpening", () => ({ CinematicOpening: () => null }));
vi.mock("@/components/ShortcutIcon", () => ({ ShortcutIcon: () => <span>Imagem do atalho</span> }));
vi.mock("@/components/InlineEditor", () => ({ InlineEditor: () => null }));
vi.mock("@/lib/admin-edit", () => ({
  useAdminEdit: () => ({ isAdmin: false, editMode: false }),
  useSiteContent: (_key: string, fallback: unknown) => [fallback, vi.fn()],
}));
vi.mock("@/integrations/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    order: async () => ({ data: [] }),
  };
  return { supabase: { from: () => query } };
});

import { ExistingHomepage } from "@/routes/index";

afterEach(cleanup);

describe("Home Hiraeth: carta Aprox na posição certa", () => {
  it("fica abaixo das bolinhas e acima dos cuidados, sem simulação nem boas-vindas automáticas", () => {
    const { container } = render(<ExistingHomepage />);
    const portals = container.querySelector(".hiraeth-home-portals");
    const aprox = container.querySelector("#aprox-nfc");
    const care = container.querySelector(".hiraeth-care-atmosphere");
    expect(portals).not.toBeNull();
    expect(aprox).not.toBeNull();
    expect(care).not.toBeNull();
    expect(portals!.compareDocumentPosition(aprox!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(aprox!.compareDocumentPosition(care!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir carta da Aprox" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /boas-vindas|primeira visita/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simular aproximação/i })).not.toBeInTheDocument();
  });
});
