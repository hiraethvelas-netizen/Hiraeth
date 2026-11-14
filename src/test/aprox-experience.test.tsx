import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AproxExperience } from "@/components/AproxExperience";

afterEach(cleanup);

describe("Carta da Aprox na página inicial", () => {
  it("mostra um recado curto e abre e fecha a carta sem simulador", () => {
    render(<AproxExperience />);
    expect(screen.getByRole("heading", { name: "Uma chama. Um toque. Um universo." })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Abrir carta da Aprox/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("article", { name: /Carta sobre a tecnologia Aprox/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("article", { name: "Carta sobre a tecnologia Aprox" })).toBeInTheDocument();
    expect(screen.getByText(/A Aprox também participou do desenvolvimento/)).toBeInTheDocument();
    expect(screen.getByText(/Não é preciso instalar o aplicativo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simular aproximação NFC/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar carta" }));
    expect(screen.queryByRole("article", { name: /Carta sobre a tecnologia Aprox/ })).not.toBeInTheDocument();
  });

  it("mostra o Instagram oficial da Aprox como link externo clicável dentro da carta", () => {
    render(<AproxExperience />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir carta da Aprox" }));
    expect(screen.getByRole("link", { name: "Abrir o Instagram da Aprox (@aprox.oficiall)" }))
      .toHaveAttribute("href", "https://www.instagram.com/aprox.oficiall?xtok=MWhyenExZGY2anZlOQ==");
    expect(screen.getByRole("link", { name: "Abrir o Instagram da Aprox (@aprox.oficiall)" }))
      .toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Abrir o Instagram da Aprox (@aprox.oficiall)" }))
      .toHaveAttribute("rel", "noopener noreferrer");
  });

  it("explica a relação entre vela, NFC e aplicativo em termos acessíveis", () => {
    render(<AproxExperience />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir carta da Aprox" }));
    expect(screen.getByText(/aproxime um celular compatível com NFC/)).toBeInTheDocument();
    expect(screen.getByText(/círculo do fogo/i)).toBeInTheDocument();
    expect(screen.getByText(/acesso à internet/i)).toBeInTheDocument();
  });
});
