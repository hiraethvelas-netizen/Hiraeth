import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AproxExperience } from "@/components/AproxExperience";

afterEach(cleanup);

describe("Tecnologia Aprox explicada no app", () => {
  it("abre uma carta interativa e explica como funciona o NFC em três etapas", () => {
    render(<AproxExperience />);
    expect(screen.getByRole("heading", { name: "Quando a chama encontra a tecnologia." })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Abra o segredo da aproximação/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/A Aprox conecta a vela ao universo digital/)).toBeInTheDocument();
    expect(screen.getByText(/Não é preciso instalar o aplicativo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2. Atravesse/ }));
    expect(screen.getByText(/O celular abre uma página/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /3. Permaneça/ }));
    expect(screen.getByRole("link", { name: /Conhecer o Acervo/ })).toHaveAttribute("href", "/loja");
  });
  it("distingue o simulador ilustrativo da leitura real do NFC", () => {
    render(<AproxExperience />);
    fireEvent.click(screen.getByRole("button", { name: /Abra o segredo da aproximação/ }));
    fireEvent.click(screen.getByRole("button", { name: "Simular aproximação NFC" }));
    expect(screen.getByText("Portal aberto")).toBeInTheDocument();
    expect(screen.getByText(/Demonstração ilustrativa/)).toBeInTheDocument();
  });
});
