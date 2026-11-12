import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductDescription } from "@/components/ProductDescription";

const description = "Um presente misterioso e um novo portal para descobrir. " +
  "Uma história especial espera por você. " +
  "Detalhes que tornam sua experiência especial: – Vela de 100 g. – Fragrância misteriosa.";

afterEach(cleanup);

describe("Apresentação compacta do produto", () => {
  it("mostra um resumo e mantém a descrição longa recolhida", () => {
    render(<ProductDescription id="surpresa" description={description} features={["Pavio de algodão."]}
      pyramid={{ top: [], heart: [], base: [] }} showPyramid={false} />);
    expect(screen.getByText("Um presente misterioso e um novo portal para descobrir.")).toBeInTheDocument();
    expect(screen.queryByText("Uma história especial espera por você.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ler descrição completa" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Ler descrição completa" }));
    expect(screen.getByRole("region", { name: "Descrição completa da vela" })).toBeInTheDocument();
    expect(screen.getByText("Uma história especial espera por você.")).toBeInTheDocument();
    expect(screen.getByText("Vela de 100 g.")).toBeInTheDocument();
    expect(screen.getByText("Fragrância misteriosa.")).toBeInTheDocument();
    expect(screen.getByText("Pavio de algodão.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recolher descrição" }));
    expect(screen.queryByText("Vela de 100 g.")).not.toBeInTheDocument();
  });

  it("recolhe a pirâmide olfativa junto da descrição, preservando suas notas", () => {
    render(<ProductDescription id="aguia" description="Uma floresta acolhedora."
      features={[]} pyramid={{ top: ["Lima"], heart: ["Cedro"], base: ["Musk"] }} showPyramid />);
    expect(screen.queryByText("Cedro")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ler descrição completa" }));
    expect(screen.getByText("Lima")).toBeInTheDocument();
    expect(screen.getByText("Cedro")).toBeInTheDocument();
    expect(screen.getByText("Musk")).toBeInTheDocument();
  });

  it("não mostra controle vazio para velas sem descrição nem características", () => {
    const { container } = render(<ProductDescription id="vazia" description={null}
      features={null} pyramid={{ top: [], heart: [], base: [] }} showPyramid={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
