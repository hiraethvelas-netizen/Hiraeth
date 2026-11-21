import { describe, expect, it } from "vitest";
import { defaultSummerInspirations, summerInspirationsFromTheme } from "./summer-inspirations";

describe("Portal de Verão: Colecione sensações", () => {
  it("exibe seis símbolos com histórias sem imagens das velas", () => {
    const inspirations = summerInspirationsFromTheme({});
    expect(inspirations).toHaveLength(6);
    expect(inspirations.map(item => item.emoji)).toEqual(["🌺", "🍍", "🍋", "🌿", "🍐", "🐚"]);
    expect(inspirations.map(item => item.title)).toEqual(defaultSummerInspirations.map(item => item.title));
    expect(inspirations.every(item => item.visible && item.sensation.length > 50)).toBe(true);
  });

  it("não inventa notas olfativas enquanto não forem fornecidas", () => {
    expect(summerInspirationsFromTheme({}).every(item =>
      !item.pyramid.saida && !item.pyramid.corpo && !item.pyramid.fundo)).toBe(true);
  });

  it("preserva notas cadastradas e itens ocultados no editor", () => {
    const custom = {
      ...defaultSummerInspirations[0]!,
      pyramid: { saida: "Nota de saída", corpo: "Nota de corpo", fundo: "Nota de fundo" },
      visible: false,
    };
    const read = summerInspirationsFromTheme({
      summer: { inspirations_configured: true, inspirations: [custom] },
    });
    expect(read).toEqual([custom]);
  });

  it("não ressuscita a coleção quando todas as inspirações forem ocultadas", () => {
    expect(summerInspirationsFromTheme({
      summer: { inspirations_configured: true, inspirations: [] },
    })).toEqual([]);
  });
});
