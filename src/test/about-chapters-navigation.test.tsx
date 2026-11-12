import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
}));
vi.mock("@/components/SiteLayout", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/InlineEditor", () => ({ InlineEditor: () => null }));
vi.mock("@/lib/admin-edit", () => ({
  useAdminEdit: () => ({ editing: false, isAdmin: false }),
  useSiteContent: (_key: string, fallback: unknown) => [fallback, vi.fn()],
  uploadSiteImage: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null }),
  };
  return { supabase: { from: () => query } };
});

import { Route } from "@/routes/sobre";
const Sobre = (Route.options as { component: ComponentType }).component;

afterEach(cleanup);

describe("Conheça a Hiraeth: capítulos sem rolagem interminável", () => {
  it("começa com o significado curto e mostra apenas o capítulo 1", () => {
    render(<Sobre />);
    expect(screen.getByRole("heading", { name: /O que significa Hiraeth/ })).toBeInTheDocument();
    expect(screen.queryByText(/Também é a saudade que sentimos/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descobrir mais sobre Hiraeth" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("heading", { name: /Toda história tem um começo/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Nossa primeira história foi escrita/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Capítulo \d{2}/ })).toHaveLength(6);
    expect(screen.queryByRole("heading", { name: /Quando a chama encontra a tecnologia/ })).not.toBeInTheDocument();
  });

  it("expande e recolhe o significado sem empilhar capítulos", () => {
    render(<Sobre />);
    const btn = screen.getByRole("button", { name: "Descobrir mais sobre Hiraeth" });
    fireEvent.click(btn);
    expect(screen.getByText(/Também é a saudade que sentimos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recolher significado" }));
    expect(screen.queryByText(/Também é a saudade que sentimos/)).not.toBeInTheDocument();
  });

  it("substitui o capítulo visível ao tocar no capítulo 2, e retorna ao 1", () => {
    render(<Sobre />);
    const first = screen.getByRole("button", { name: "Capítulo 01" });
    const second = screen.getByRole("button", { name: "Capítulo 02" });
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: /Nossa primeira história foi escrita/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Toda história tem um começo/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll("#hiraeth-capitulo-ativo")).toHaveLength(1);
    fireEvent.click(first);
    expect(screen.getByRole("heading", { name: /Toda história tem um começo/ })).toBeInTheDocument();
  });
});
