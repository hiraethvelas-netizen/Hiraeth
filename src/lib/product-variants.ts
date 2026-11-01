export type VariantValue = { id: string; label: string };
export type VariantGroup = { id: string; name: string; values: VariantValue[] };
export type CombinationVariant = {
  key: string;
  type: "combination";
  label: string;
  options: Record<string, string>;
  price: number;
  sale_price: number | null;
  stock: number;
  image: string;
};
export type LegacyVariant = Record<string, unknown>;
export type VariantSetup = {
  groups: VariantGroup[];
  rows: CombinationVariant[];
  legacy: LegacyVariant[] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (s: string) => s.trim();

export const optionKey = (options: Record<string, string>) =>
  "combo:" + JSON.stringify(Object.entries(options));

export function variantList(raw: unknown): LegacyVariant[] {
  return Array.isArray(raw) ? raw.filter(isRecord) : [];
}

export function isCombinationVariant(variant: unknown): variant is CombinationVariant {
  return isRecord(variant) && isRecord(variant.options) && Object.keys(variant.options).length > 0 &&
    Object.values(variant.options).every(value => typeof value === "string");
}

export function managedVariants(raw: unknown): CombinationVariant[] {
  return variantList(raw).filter(isCombinationVariant).map(row => ({
    ...row,
    type: "combination" as const,
    key: typeof row.key === "string" ? row.key : optionKey(row.options),
    label: typeof row.label === "string" ? row.label : Object.values(row.options).join(" / "),
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
    sale_price: row.sale_price == null || row.sale_price === "" ? null : Number(row.sale_price),
    stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : 0,
    image: typeof row.image === "string" ? row.image : "",
  }));
}

export function variantSetupFrom(raw: unknown): VariantSetup {
  const existing = variantList(raw);
  const managed = managedVariants(existing);
  if (!existing.length) return { groups: [], rows: [], legacy: null };
  // Old size/house JSON remains unchanged until the merchant explicitly converts it.
  if (managed.length !== existing.length) return { groups: [], rows: [], legacy: existing };
  const optionNames = Object.keys(managed[0]?.options ?? {});
  const groups = optionNames.map((name, i) => ({
    id: "group-" + i, name,
    values: [...new Set(managed.map(v => v.options[name]).filter(Boolean))].map((label, j) =>
      ({ id: i + "-value-" + j, label })),
  }));
  return { groups, rows: managed, legacy: null };
}

export function variantCombinations(groups: VariantGroup[], previous: CombinationVariant[], fallbackPrice: number): CombinationVariant[] {
  if (groups.length === 0 || groups.some(group => !nonempty(group.name) || group.values.length === 0 ||
    group.values.some(value => !nonempty(value.label)))) return [];
  let combinations: Record<string, string>[] = [{}];
  for (const group of groups) {
    const next: Record<string, string>[] = [];
    for (const row of combinations) for (const value of group.values) {
      next.push({ ...row, [group.name.trim()]: value.label.trim() });
      if (next.length > 200) return [];
    }
    combinations = next;
  }
  return combinations.map(options => {
    const key = optionKey(options);
    const previousRow = previous.find(row =>
      row.key === key || Object.values(row.options).join("|") === Object.values(options).join("|"));
    return previousRow ? {
      ...previousRow,
      key, type: "combination", label: Object.values(options).join(" / "), options,
    } : {
      key, type: "combination", label: Object.values(options).join(" / "),
      options, price: Number.isFinite(fallbackPrice) ? fallbackPrice : 0,
      sale_price: null, stock: 0, image: "",
    };
  });
}

export function validateVariantSetup(setup: VariantSetup): string | null {
  if (setup.legacy) return null;
  if (!setup.groups.length) return null;
  if (setup.groups.length > 3) return "Use até três tipos de variação por produto.";
  const names = setup.groups.map(g => g.name.trim().toLocaleLowerCase("pt-BR"));
  if (names.some(n => !n)) return "Informe o nome de cada variação (por exemplo, Cor ou Tamanho).";
  if (new Set(names).size !== names.length) return "Não repita o nome de uma variação.";
  for (const group of setup.groups) {
    if (!group.values.length || group.values.some(v => !v.label.trim()))
      return "Preencha as opções da variação " + group.name + ".";
    const values = group.values.map(v => v.label.trim().toLocaleLowerCase("pt-BR"));
    if (new Set(values).size !== values.length) return "Não repita opções em " + group.name + ".";
  }
  const total = setup.groups.reduce((count, group) => count * group.values.length, 1);
  if (total > 200) return "O máximo é 200 combinações. Reduza as opções.";
  if (setup.rows.length !== total) return "Confira as combinações antes de salvar.";
  if (setup.rows.some(row => !Number.isFinite(row.price) || row.price < 0 ||
    !Number.isInteger(row.stock) || row.stock < 0 ||
    (row.sale_price != null && (!Number.isFinite(row.sale_price) || row.sale_price < 0 || row.sale_price > row.price))))
    return "Confira preços, preços promocionais e estoque das combinações.";
  return null;
}

export function legacyToManaged(legacy: LegacyVariant[], fallbackPrice: number): VariantSetup {
  const types = [...new Set(legacy.map(v => String(v.type ?? "size")))];
  const groupForType = (type: string, index: number): VariantGroup => ({
    id: "legacy-" + index,
    name: type === "size" ? "Tamanho" : type === "house" ? "Casa" : "Variação " + (index + 1),
    values: legacy.filter(v => String(v.type ?? "size") === type)
      .map((v, j) => ({ id: "legacy-" + index + "-" + j, label: String(v.label ?? v.key ?? "").trim() }))
      .filter(v => v.label),
  });
  const groups = types.map(groupForType).filter(g => g.values.length);
  const rows = variantCombinations(groups, [], fallbackPrice).map(row => {
    // Preserve existing size pricing/stock and the image for the selected house.
    const size = legacy.find(v => String(v.type ?? "size") === "size" &&
      row.options.Tamanho === String(v.label ?? v.key ?? ""));
    const house = legacy.find(v => String(v.type ?? "") === "house" &&
      row.options.Casa === String(v.label ?? v.key ?? ""));
    const source = size ?? house ?? legacy.find(v => Object.values(row.options).includes(String(v.label))) ?? null;
    const price = source?.price == null ? fallbackPrice : Number(source.price);
    const salePrice = source?.sale_price == null ? null : Number(source.sale_price);
    return {
      ...row,
      price: Number.isFinite(price) ? price : fallbackPrice,
      sale_price: salePrice != null && Number.isFinite(salePrice) ? salePrice : null,
      stock: Number.isFinite(Number(source?.stock)) ? Number(source?.stock) : 0,
      image: typeof house?.image === "string" ? house.image : typeof size?.image === "string" ? size.image : "",
    };
  });
  return { groups, rows, legacy: null };
}

export function variantTotalStock(setup: VariantSetup, fallback: number) {
  if (setup.legacy) {
    const items = setup.legacy.filter(v => v.type !== "house");
    const sum = items.reduce((n, v) => n + Number(v.stock || 0), 0);
    return items.length ? sum : fallback;
  }
  return setup.rows.length ? setup.rows.reduce((n, v) => n + v.stock, 0) : fallback;
}
