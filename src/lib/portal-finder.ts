import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;
export type PortalMood = "aconchego" | "magia" | "frescor" | "misterio";
export const PORTAL_MOODS: { id: PortalMood; label: string; description: string }[] = [
  { id: "aconchego", label: "Aconchego", description: "Uma tarde de leitura" },
  { id: "magia", label: "Magia", description: "Um universo para fugir" },
  { id: "frescor", label: "Frescor", description: "Um respiro leve" },
  { id: "misterio", label: "Mistério", description: "Uma história inesperada" },
];

// Termos reais de fragrância/atmosfera têm prioridade sobre palavras genéricas
// como "magia", que aparecem em praticamente todas as descrições da marca.
const MOOD_TERMS: Record<PortalMood, [string, number][]> = {
  aconchego: [
    ["baunilha", 8], ["canela", 7], ["chocolate", 7], ["cafe", 7],
    ["aconchego", 5], ["aconchegante", 5], ["cremoso", 5], ["quentinha", 4],
    ["quente", 4], ["carinho", 3], ["lar", 3], ["doce", 3], ["abraco", 3],
  ],
  magia: [
    ["chapeu seletor", 9], ["castelo", 7], ["hogwarts", 7],
    ["feitico", 6], ["encantado", 5], ["encantadas", 4],
    ["salao", 5], ["fantasia", 4], ["floresta proibida", 4],
    ["magia", 1], ["magico", 2], ["magica", 2],
  ],
  frescor: [
    ["bambu", 9], ["alecrim", 8], ["cha branco", 9],
    ["pera", 7], ["limão", 8], ["limao", 8], ["oceano", 9],
    ["praia", 8], ["floresta de inverno", 8],
    ["ar puro", 6], ["fresco", 7], ["frescor", 7], ["refrescante", 7],
    ["natureza", 3], ["brisa", 6], ["leve", 2],
  ],
  misterio: [
    ["surpresa", 10], ["misterioso", 9], ["misteriosa", 9],
    ["misterio", 9], ["segredo", 8], ["secreto", 8],
    ["inesperado", 7], ["inesperada", 7], ["enigma", 8],
    ["noturno", 6], ["noite", 4], ["sombrio", 6],
    ["profundo", 3], ["champagne", 3],
  ],
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function contains(text: string, phrase: string): boolean {
  const normalized = normalize(phrase);
  // Evita falsos positivos: "mar" não deve encontrar "marcante".
  return text.split(normalized).some((_, index, parts) =>
    index < parts.length - 1 &&
    (index === 0 || !/[a-z0-9]$/.test(parts[index]!)) &&
    !/^[a-z0-9]/.test(parts[index + 1] ?? ""));
}

function productFamily(product: Product): string {
  // Tamanhos 100g e 250g da mesma vela contam como uma única inspiração.
  return normalize(product.name).replace(/\b(?:100|250)\s*g\b/g, "").replace(/\s+/g, " ").trim();
}

function relevance(product: Product, mood: PortalMood, category: string): number {
  const name = normalize(product.name);
  const fragrance = normalize(product.fragrance ?? "");
  const description = normalize(product.description ?? "");
  const collection = normalize(category);
  return MOOD_TERMS[mood].reduce((score, [term, weight]) => {
    return score
      + (contains(name, term) ? weight * 5 : 0)
      + (contains(fragrance, term) ? weight * 4 : 0)
      + (contains(description, term) ? weight : 0)
      + (mood !== "magia" && contains(collection, term) ? weight : 0);
  }, 0);
}

type Candidate = { product: Product; family: string; score: number };

/**
 * Recomenda velas publicadas, com correspondência real ao clima escolhido.
 * Uma otimização conjunta evita repetir a mesma inspiração entre climas
 * enquanto houver outras velas adequadas. Não usa perfil, contas ou dados pessoais.
 */
export function findPortalForMood(
  products: Product[],
  categories: Category[],
  mood: PortalMood,
): { product: Product; matched: boolean } | null {
  const categoryNames = new Map(categories.map(category => [category.id, category.name]));
  const available = products.filter(product =>
    product.status === "published" && (!product.product_type || product.product_type === "candle"));
  if (!available.length) return null;

  const moodCandidates = PORTAL_MOODS.map(item => {
    const byFamily = new Map<string, Candidate>();
    for (const product of available) {
      const family = productFamily(product);
      const score = relevance(product, item.id, categoryNames.get(product.category_id ?? "") ?? "");
      if (score < 4) continue; // Não inventar uma combinação quando não há evidência.
      const current = byFamily.get(family);
      if (!current || score > current.score ||
        (score === current.score && product.name.localeCompare(current.product.name, "pt-BR") < 0)) {
        byFamily.set(family, { product, family, score });
      }
    }
    return [...byFamily.values()]
      .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family, "pt-BR"))
      .slice(0, 8);
  });

  let bestScore = -1;
  let best: (Candidate | null)[] = [];
  // Apenas quatro climas: busca exata para escolher recomendações diferentes
  // sempre que isso melhora o conjunto sem recorrer a velas sem relação.
  function assign(index: number, used: Set<string>, chosen: (Candidate | null)[], total: number): void {
    if (index === PORTAL_MOODS.length) {
      if (total > bestScore) {
        bestScore = total;
        best = [...chosen];
      }
      return;
    }
    for (const candidate of moodCandidates[index]!) {
      if (used.has(candidate.family)) continue;
      used.add(candidate.family);
      chosen.push(candidate);
      assign(index + 1, used, chosen, total + candidate.score);
      chosen.pop();
      used.delete(candidate.family);
    }
    chosen.push(null);
    assign(index + 1, used, chosen, total);
    chosen.pop();
  }
  assign(0, new Set<string>(), [], 0);
  const result = best[PORTAL_MOODS.findIndex(item => item.id === mood)];
  return result ? { product: result.product, matched: true } : null;
}
