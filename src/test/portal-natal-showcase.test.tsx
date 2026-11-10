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
    fireEvent.click(salaoButton);
    expect(screen.getByText("Inspiração: amigos no grande salão.")).toBeInTheDocument();
    expect(screen.queryByText("Inspiração: primeiro presente de Natal.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Recolher história/ }));
    expect(screen.queryByText("Inspiração: amigos no grande salão.")).not.toBeInTheDocument();
  });
});
