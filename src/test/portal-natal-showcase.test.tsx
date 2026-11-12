import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalChristmasShowcase } from "@/components/PortalChristmasShowcase";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;
const fragments = [
  { id: "fios", position: 8, title: "Entre Fios e Magia", body: "Inspiração: primeiro presente de Natal.", context: "Aroma: Baunilha e Canela", image_url: null },
  { id: "salao", position: 9, title: "O Grande Salão de Natal", body: "Inspiração: amigos no grande salão.", context: "Aroma: Pinheiro e Laranja", image_url: null },
] as Fragment[];

afterEach(() => cleanup());

describe("Vitrine natalina do Portal NFC", () => {
  it("mostra as duas fotografias incluídas no GitHub sem placeholders", () => {
    render(<PortalChristmasShowcase fragments={fragments} />);
    expect(screen.getByRole("img", { name: "Vela Entre Fios e Magia" })).toHaveAttribute("src", expect.any(String));
    expect(screen.getByRole("img", { name: "Vela O Grande Salão de Natal" })).toHaveAttribute("src", expect.any(String));
    expect(screen.queryByText("Fotografia em breve")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspiração: primeiro presente de Natal.")).not.toBeInTheDocument();
  });

  it("revela cada história ao tocar na fotografia e permite recolher", () => {
    render(<PortalChristmasShowcase fragments={fragments} />);
    const entreButton = screen.getByRole("button", { name: /Entre Fios e Magia/ });
    const salaoButton = screen.getByRole("button", { name: /O Grande Salão de Natal/ });
    fireEvent.click(entreButton);
    expect(screen.getByText("Inspiração: primeiro presente de Natal.")).toBeInTheDocument();
    expect(screen.queryByText("Inspiração: amigos no grande salão.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fechar informações da vela/ }));
    fireEvent.click(salaoButton);
    expect(screen.getByRole("dialog", { name: "O Grande Salão de Natal" })).toBeInTheDocument();
    expect(screen.getByText("Inspiração: amigos no grande salão.")).toBeInTheDocument();
    expect(screen.queryByText("Inspiração: primeiro presente de Natal.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fechar informações da vela/ }));
    expect(screen.queryByText("Inspiração: amigos no grande salão.")).not.toBeInTheDocument();
  });
  it("mostra a pirâmide de Chocolate & Baunilha apenas em Revelar aroma", () => {
    const chocolate = {
      ...fragments[0],
      context: "Aroma: Chocolate & Baunilha",
      body: "O primeiro suéter da Sra. Weasley.\n\nPirâmide olfativa\n\nSaída — Notas tostadas\nAnis, pêssego e cacau.\n\nCorpo — Chocolate cremoso\nChocolate e leite.\n\nFundo — Calor amadeirado\nBaunilha e âmbar.",
    } as Fragment;
    render(<PortalChristmasShowcase fragments={[chocolate, fragments[1]!]} />);
    fireEvent.click(screen.getByRole("button", { name: /Conhecer Entre Fios e Magia/ }));
    const dialog = screen.getByRole("dialog", { name: "Entre Fios e Magia" });
    expect(screen.getByText("O primeiro suéter da Sra. Weasley.")).toBeInTheDocument();
    expect(screen.queryByText("Anis, pêssego e cacau.")).not.toBeInTheDocument();
    const revelar = screen.getByRole("button", { name: "Revelar aroma" });
    expect(revelar).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(revelar);
    expect(dialog).toContainElement(screen.getByText("Aroma: Chocolate & Baunilha"));
    expect(screen.getByText("Anis, pêssego e cacau.")).toBeInTheDocument();
    expect(screen.getByText("Chocolate e leite.")).toBeInTheDocument();
    expect(screen.getByText("Baunilha e âmbar.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar aroma" }));
    expect(screen.queryByText("Anis, pêssego e cacau.")).not.toBeInTheDocument();
  });

});
