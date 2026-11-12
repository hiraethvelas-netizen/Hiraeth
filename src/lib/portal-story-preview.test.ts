import { describe, expect, it } from "vitest";
import { portalShortTeaser, splitPortalStory } from "@/lib/portal-story-preview";

describe("Histórias breves e interativas do NFC", () => {
  it("separa abertura e continuação sem perder nenhuma palavra", () => {
    const text = ["A magia nasceu em uma tarde tranquila.",
      "A segunda lembrança trouxe um perfume especial.",
      "Mais uma frase para completar essa história."].join(" ");
    const result = splitPortalStory(text, 75);
    expect(result.preview.length).toBeLessThanOrEqual(75);
    expect(result.rest.length).toBeGreaterThan(0);
    expect(result.preview + " " + result.rest).toBe(text);
  });
  it("não obriga a clicar de novo em textos naturalmente curtos", () => {
    expect(splitPortalStory("Um aroma que acolhe.", 200)).toEqual({
      preview: "Um aroma que acolhe.", rest: "",
    });
  });
  it("limita chamadas longas e mantém as curtas", () => {
    expect(portalShortTeaser("Histórias entre velas e livros.")).toBe("Histórias entre velas e livros.");
    const teaser = portalShortTeaser("Uma lembrança perfumada ".repeat(15), 110);
    expect(teaser.length).toBeLessThan(120);
    expect(teaser.endsWith("…")).toBe(true);
  });
});
