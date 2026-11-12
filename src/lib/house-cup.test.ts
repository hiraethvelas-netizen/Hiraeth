import { describe, expect, it } from "vitest";
import { HOUSES, getHouse, percentage } from "@/lib/house-cup";

describe("Casas da Hiraeth", () => {
  it("define as quatro casas sem repetir identificadores", () => {
    expect(HOUSES).toHaveLength(4);
    expect(new Set(HOUSES.map(h => h.id)).size).toBe(4);
  });
  it("encontra as casas e ignora pessoas indecisas", () => {
    expect(getHouse("leao")?.label).toBe("Casa do Leão");
    expect(getHouse("serpente")?.animal).toBe("🐍");
    expect(getHouse(null)).toBeUndefined();
    expect(getHouse("inexistente")).toBeUndefined();
  });
  it("mantém 0% no placar vazio e usa denominador total", () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(1, 4)).toBe(25);
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 4)).toBe(50);
  });
});
