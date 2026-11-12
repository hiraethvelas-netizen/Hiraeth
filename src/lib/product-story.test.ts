import { describe, expect, it } from "vitest";
import { parseProductStory } from "@/lib/product-story";

describe("Descrição das velas Hiraeth", () => {
  it("separa o resumo da história e da lista de detalhes sem perder o texto cadastrado", () => {
    const raw = "Um presente misterioso, uma fragrância inesperada e um novo portal esperando para ser descoberto. " +
      "Para aqueles que amam surpresas e acreditam na magia de descobrir o inesperado. " +
      "✨ ✨ Detalhes que tornam sua experiência especial: – Vela surpresa de 100 g. – Fragrância misteriosa. " +
      "– Acesso a um novo portal exclusivo. – Pavio de algodão.";
    const result = parseProductStory(raw, ["Recipiente de vidro."]);
    expect(result.summary).toBe("Um presente misterioso, uma fragrância inesperada e um novo portal esperando para ser descoberto.");
    expect(result.story).toContain("Para aqueles que amam surpresas");
    expect(result.story).not.toContain("Detalhes que tornam");
    expect(result.details).toEqual([
      "Vela surpresa de 100 g.", "Fragrância misteriosa.",
      "Acesso a um novo portal exclusivo.", "Pavio de algodão.", "Recipiente de vidro.",
    ]);
  });

  it("respeita descrições curtas e mantém características separadas", () => {
    expect(parseProductStory("Aroma de inverno.", ["Pavio de algodão."])).toEqual({
      summary: "Aroma de inverno.", story: "", details: ["Pavio de algodão."],
    });
  });

  it("não duplica características e trata descrições vazias", () => {
    expect(parseProductStory(null, ["Recipiente de vidro.", "Recipiente de vidro."])).toEqual({
      summary: "", story: "", details: ["Recipiente de vidro."],
    });
  });

  it("limita a introdução quando o texto cadastrado não possui pontuação", () => {
    const text = "Um portal encantado ".repeat(25);
    const result = parseProductStory(text);
    expect(result.summary.length).toBeLessThan(205);
    expect(result.story.length).toBeGreaterThan(0);
  });
});
