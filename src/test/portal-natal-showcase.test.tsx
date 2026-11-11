import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalChristmasShowcase } from "@/components/PortalChristmasShowcase";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;
const fragments = [
  {
    id: "fios",
    position: 8,
    title: "Entre Fios e Magia",
    body: "Inspiração: primeiro presente de Natal.",
    context: "Aroma: Baunilha e Canela",
    image_url: null,
  },
  {
    id: "salao",
    position: 9,
    title: "O Grande Salão de Natal",
    body: "Inspiração: amigos no grande salão.",
    context: "Aroma: Pinheiro e Laranja",
    image_url: null,
  },
] as Fragment[];

afterEach(() => cleanup());

describe("Vitrine natalina do Portal NFC", () => {
  it("mostra as duas fotografias incluídas no GitHub sem placeholders", () => {
    render(<PortalChristmasShowcase fragments={fragments} />);
    expect(screen.getByRole("img", { name: "Vela Entre Fios e Magia" })).toHaveAttribute(
      "src",
      expect.any(String),
    );
    expect(screen.getByRole("img", { name: "Vela O Grande Salão de Natal" })).toHaveAttribute(
      "src",
      expect.any(String),
    );
    expect(screen.queryByText("Fotografia em breve")).not.toBeInTheDocument();
    expect(screen.getAllByText("Imagem ilustrativa")).toHaveLength(2);
    expect(screen.queryByText("Inspiração: primeiro presente de Natal.")).not.toBeInTheDocument();
  });

  it("mantém uma foto própria já cadastrada para a vela", () => {
    render(
      <PortalChristmasShowcase
        fragments={[{ ...fragments[0]!, image_url: "/foto-propria.jpg" }]}
      />,
    );
    expect(screen.getByRole("img", { name: "Vela Entre Fios e Magia" })).toHaveAttribute(
      "src",
      "/foto-propria.jpg",
    );
    expect(screen.queryByText("Imagem ilustrativa")).not.toBeInTheDocument();
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

  it("mantém o teclado no modal e restaura a rolagem e o foco ao fechar", () => {
    const previousOverflow = document.body.style.overflow;
    render(<PortalChristmasShowcase fragments={fragments} />);
    const trigger = screen.getByRole("button", { name: /Entre Fios e Magia/ });
    fireEvent.click(trigger);
    const close = screen.getByRole("button", { name: "Fechar informações da vela" });
    const back = screen.getByRole("button", { name: "Voltar às velas" });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(back).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe(previousOverflow);
    expect(trigger).toHaveFocus();
  });
});
