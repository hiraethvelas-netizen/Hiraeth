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

  it("não recomenda Frescor como se fosse Mistério quando não há uma vela misteriosa", () => {
    const products = [{ id: "aguia", slug: "casa-da-aguia", name: "Casa da Águia 100g",
      description: "Aroma fresco de Floresta de Inverno e ar puro.", fragrance: "",
      images: [], status: "published", product_type: "candle", category_id: null }] as unknown as Tables<"products">[];
    render(<DiscoverMyPortal products={products} categories={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Descobrir meu portal/ }));
    fireEvent.click(screen.getByRole("button", { name: /Mistério/ }));
    fireEvent.click(screen.getByRole("button", { name: /Revelar meu portal/ }));
    expect(screen.getByText(/Ainda não há uma vela publicada que combine claramente com Mistério/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar o Acervo completo" })).toHaveAttribute("href", "/loja");
    expect(screen.queryByRole("heading", { name: "Casa da Águia 100g" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar outro caminho" }));
    fireEvent.click(screen.getByRole("button", { name: /Frescor/ }));
    fireEvent.click(screen.getByRole("button", { name: /Revelar meu portal/ }));
    expect(screen.getByRole("heading", { name: "Casa da Águia 100g" })).toBeInTheDocument();
  });
});
