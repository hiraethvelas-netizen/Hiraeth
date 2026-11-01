import { describe, expect, it } from "vitest";
import { legacyToManaged, managedVariants, validateVariantSetup, variantCombinations, variantSetupFrom, variantTotalStock, type VariantGroup } from "./product-variants";

const groups: VariantGroup[] = [
  { id: "cor", name: "Cor", values: [{ id: "c1", label: "Vermelha" }, { id: "c2", label: "Preta" }] },
  { id: "tam", name: "Tamanho", values: [{ id: "t1", label: "P" }, { id: "t2", label: "M" }] },
];

describe("e-commerce product variations", () => {
  it("creates every size/color combination with independent inventory", () => {
    const rows = variantCombinations(groups, [], 65);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.options).toEqual({ Cor: "Vermelha", Tamanho: "P" });
    expect(rows[1]?.options).toEqual({ Cor: "Vermelha", Tamanho: "M" });
    const modified = rows.map(row => row.options["Cor"] === "Vermelha" && row.options["Tamanho"] === "P"
      ? { ...row, stock: 7, price: 72, image: "https://image.test/red-p.webp" } : row);
    const again = variantCombinations(groups, modified, 65);
    expect(again[0]).toMatchObject({ stock: 7, price: 72, image: "https://image.test/red-p.webp" });
    expect(again[1]).toMatchObject({ stock: 0, price: 65, image: "" });
    expect(variantTotalStock({ groups, rows: again, legacy: null }, 100)).toBe(7);
  });

  it("restores the option groups from existing saved combinations", () => {
    const rows = variantCombinations(groups, [], 50);
    const loaded = variantSetupFrom(rows);
    expect(loaded.legacy).toBeNull();
    expect(loaded.groups.map(g => [g.name, g.values.map(v => v.label)])).toEqual([
      ["Cor", ["Vermelha", "Preta"]], ["Tamanho", ["P", "M"]],
    ]);
    expect(managedVariants(rows)).toHaveLength(4);
    expect(validateVariantSetup(loaded)).toBeNull();
  });

  it("supports candle weights as a variation instead of a separate field", () => {
    const peso: VariantGroup[] = [
      { id: "p", name: "Peso", values: [{ id: "100", label: "100 g" }, { id: "250", label: "250 g" }] },
    ];
    const rows = variantCombinations(peso, [], 50);
    expect(rows.map(row => row.options["Peso"])).toEqual(["100 g", "250 g"]);
    expect(validateVariantSetup({ groups: peso, rows, legacy: null })).toBeNull();
  });

  it("keeps legacy product variants unchanged without explicit conversion", () => {
    const old = [
      { type: "size", key: "100g", label: "100 g", price: 49, stock: 9, image: "" },
      { type: "house", key: "corvinal", label: "Corvinal", price: 49, stock: 9, image: "" },
    ];
    const setup = variantSetupFrom(old);
    expect(setup.legacy).toEqual(old);
    const converted = legacyToManaged(old, 49);
    expect(converted.legacy).toBeNull();
    expect(converted.groups.map(group => group.name)).toEqual(["Tamanho", "Casa"]);
    expect(converted.rows).toHaveLength(1);
  });

  it("blocks invalid duplicates, negative stock and promotional price larger than list price", () => {
    const rows = variantCombinations(groups, [], 60);
    expect(validateVariantSetup({ groups, rows: rows.map((r,i) => i === 0 ? { ...r, stock: -1 } : r), legacy: null }))
      .toContain("estoque");
    const dupe = [...groups];
    expect(validateVariantSetup({ groups: [dupe[0]!, { ...dupe[1]!, name: "Cor" }], rows, legacy: null }))
      .toContain("Não repita");
    expect(validateVariantSetup({ groups, rows: rows.map((r,i) => i===0 ? { ...r, sale_price: 100 } : r), legacy: null }))
      .toContain("preços");
  });
});
