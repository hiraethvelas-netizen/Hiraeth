import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MagicInspirations } from "@/components/MagicInspirations";
import {
  groupMagicInspirations,
  magicHouseNames,
  type InspirationFragment,
} from "@/lib/magic-inspirations";

const fragment = (
  id: string,
  title: string,
  position: number,
  visible = true,
): InspirationFragment => ({
  id,
  title,
  position,
  visible,
  body: `Texto administrável ${id}`,
  portal_id: "portal",
  image_url: null,
  caption: null,
  context: null,
  reference: null,
});
afterEach(cleanup);

describe("Inspirações administráveis do Mundo de Magia", () => {
  it("mantém as quatro casas com os nomes aprovados", () => {
    expect(magicHouseNames).toEqual([
      "Casa do Leão",
      "Casa do Texugo",
      "Casa da Serpente",
      "Casa da Águia",
    ]);
  });
  it("agrupa por títulos sem acentos e ordena continuações pela posição", () => {
    const result = groupMagicInspirations([
      fragment("continuacao", "Um aroma especial", 3),
      fragment("carta", "Carta da Guardiã da Chama", 10),
      fragment("leao", "Casa do Leao", 2),
      fragment("origem", "Como nasceu a coleção", 0),
      fragment("seletora", "Vela Seletora", 1),
      fragment("natal1", "Natal — primeira vela", 8),
      fragment("natal2", "Segunda vela", 9),
      fragment("texugo", "Casa do Texugo", 4),
    ]);
    expect(result.houses[0]?.map((item) => item.id)).toEqual(["leao", "continuacao"]);
    expect(result.houses[1]?.map((item) => item.id)).toEqual(["texugo"]);
    expect(result.chapters.origin.map((item) => item.id)).toEqual(["origem"]);
    expect(result.chapters.selector.map((item) => item.id)).toEqual(["seletora"]);
    expect(result.chapters.christmas.map((item) => item.id)).toEqual(["natal1", "natal2"]);
    expect(result.chapters.letter.map((item) => item.id)).toEqual(["carta"]);
  });
  it("não exibe fragmentos ocultos nem perde fragmentos sem título reconhecido", () => {
    const result = groupMagicInspirations([
      fragment("preservado", "Uma história preservada", 0),
      fragment("oculto", "Carta", 1, false),
    ]);
    expect(result.chapters.origin.map((item) => item.id)).toEqual(["preservado"]);
    expect(result.chapters.letter).toEqual([]);
  });
  it("abre e fecha a carta sem autenticação nem substituir o texto administrável", () => {
    render(<MagicInspirations fragments={[fragment("carta", "Carta da Guardiã", 0)]} />);
    expect(screen.queryByRole("region", { name: "Carta aberta da Guardiã da Chama" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir carta" }));
    expect(
      screen.getByRole("region", { name: "Carta aberta da Guardiã da Chama" }),
    ).toHaveTextContent("Texto administrável carta");
    fireEvent.click(screen.getByRole("button", { name: "Fechar carta" }));
    expect(screen.queryByRole("region", { name: "Carta aberta da Guardiã da Chama" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir carta" }));
    expect(
      screen.getByRole("region", { name: "Carta aberta da Guardiã da Chama" }),
    ).toHaveTextContent("Texto administrável carta");
  });
});
