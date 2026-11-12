import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function luminance(hex: string): number {
  const rgb = hex.replace("#", "").match(/.{2}/g);
  if (!rgb || rgb.length !== 3) throw new Error("Invalid color");
  const channels = rgb.map(channel => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function ratio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
}

describe("Contraste da identidade Hiraeth (WCAG AA)", () => {
  const css = readFileSync("src/styles.css", "utf8");
  it("mantém o verde da marca, mas usa texto contrastante sobre fundo vanilla", () => {
    expect(css).toContain("--primary: #878e47;");
    expect(css).toContain(":root:not(.dark) .text-primary");
    expect(css).toContain("color: #58632f");
    expect(ratio("#58632f", "#f7efda")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#34402b", "#f7efda")).toBeGreaterThanOrEqual(4.5);
  });
  it("mantém títulos, cartões e capítulos legíveis no tema claro e no tema escuro", () => {
    const dashboard = readFileSync("src/routes/admin/index.tsx", "utf8");
    const sobre = readFileSync("src/routes/sobre.tsx", "utf8");
    const aprox = readFileSync("src/components/AproxExperience.tsx", "utf8");
    expect(aprox).toContain("Tecnologia Aprox");
    expect(aprox).not.toContain("Tecnologia NFC");
    expect(dashboard).toContain("text-[#46572b]");
    expect(dashboard).toContain("text-[#405326]");
    expect(sobre).toContain("bg-[#314333] text-[#f7efda]");
    expect(sobre).toContain("bg-[#ebe9d5] text-[#34402b]");
    expect(ratio("#46572b", "#f7efda")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#405326", "#f2ead7")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#51533b", "#f2ead7")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#f7efda", "#314333")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#34402b", "#ebe9d5")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ead4a1", "#314333")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#67451e", "#f7efda")).toBeGreaterThanOrEqual(4.5);
  });

  it("contrasta rótulos sobre botões verdes e textos claros nos painéis escuros", () => {
    expect(css).toContain("--primary-foreground: #101a13;");
    expect(ratio("#101a13", "#878e47")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#e4ca94", "#1c3026")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#f7efda", "#5b1d04")).toBeGreaterThanOrEqual(4.5);
  });
});
