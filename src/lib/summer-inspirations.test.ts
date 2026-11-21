import { describe, expect, it } from "vitest";
import { defaultSummerInspirations, summerInspirationsFromTheme } from "./summer-inspirations";

describe("Portal de Verão: Colecione sensações", () => {
  it("exibe seis inspirações e preserva o layout sem fotos ainda não cadastradas", () => {
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

  it("mantém os arquivos fotográficos originais e o enquadramento sem recomprimir", () => {
    const original = defaultSummerInspirations[0]!;
    const custom = { ...original,
      image_url: "https://example.com/flores-original-2400px.png",
      image_zoom: 1.75, image_rotation: -90, image_x: 14, image_y: -6, image_fit: "cover" as const,
    };
    const read = summerInspirationsFromTheme({
      summer: { inspirations_configured: true, inspirations: [custom] },
    });
    expect(read[0]).toMatchObject({
      image_url: custom.image_url,
      image_zoom: 1.75, image_rotation: -90, image_x: 14, image_y: -6, image_fit: "cover",
    });
  });

  it("preserva valores padrão em temas antigos que não possuem campos de fotografia", () => {
    const oldEntry = { id: "flores-de-janeiro", title: "Flores de Janeiro", visible: true };
    const read = summerInspirationsFromTheme({
      summer: { inspirations_configured: true, inspirations: [oldEntry] },
    });
    expect(read[0]).toMatchObject({
      image_url: "/images/portal-verao/flores-de-janeiro.webp",
      image_zoom: 1, image_rotation: 0, image_x: 0, image_y: 0, image_fit: "cover",
    });
  });
  it("usa as cinco fotografias correspondentes, preservando a sexta sem revelação", () => {
    const images = summerInspirationsFromTheme({}).map(item => item.image_url);
    expect(images).toEqual([
      "/images/portal-verao/flores-de-janeiro.webp",
      "/images/portal-verao/sol-na-pele.webp",
      "/images/portal-verao/caipirinha.webp",
      "/images/portal-verao/sombra-fresca.webp",
      "/images/portal-verao/aguas-de-cristal.webp",
      "",
    ]);
  });

});
