import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Tables } from "@/integrations/supabase/types";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, ...props }: { children: ReactNode; params?: { slug: string }; [key: string]: unknown }) =>
    <a {...props} href={"/produto/" + params?.slug}>{children}</a>,
}));
import { DiscoverMyPortal } from "@/components/DiscoverMyPortal";

afterEach(cleanup);

describe("Quiz leve do Acervo", () => {
  it("permite escolher um clima e visitar uma vela sem alterar a grade", () => {
    const products = [{ id: "sombra", slug: "sombra-fresca", name: "Sombra Fresca",
      description: "", fragrance: "Bambu e alecrim", images: [], status: "published", product_type: "candle",
      category_id: null }] as unknown as Tables<"products">[];
    render(<DiscoverMyPortal products={products} categories={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Descobrir meu portal/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Frescor/ }));
    fireEvent.click(screen.getByRole("button", { name: /Revelar meu portal/ }));
    expect(screen.getByRole("heading", { name: "Sombra Fresca" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Conhecer esta vela/ }))
      .toHaveAttribute("href", "/produto/sombra-fresca");
    fireEvent.click(screen.getByRole("button", { name: /Tentar outro caminho/ }));
    expect(screen.getByRole("button", { name: /Aconchego/ })).toBeInTheDocument();
  });
});
