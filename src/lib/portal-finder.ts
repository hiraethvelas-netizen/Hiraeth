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

const terms: Record<PortalMood, string[]> = {
  aconchego: ["baunilha", "chocolate", "canela", "café", "cafe", "doce", "cremoso", "aconchego", "família", "familia"],
  magia: ["magia", "magico", "mágico", "castelo", "hogwarts", "seleto", "feitic", "floresta", "casa", "fantasia"],
  frescor: ["fresco", "frescor", "oceano", "mar", "chá branco", "pera", "alecrim", "bambu", "limão", "limão-siciliano"],
  misterio: ["mistério", "misterio", "surpresa", "secreto", "enigma", "noturno", "noite", "champagne", "sombrio"],
};

export function findPortalForMood(products: Product[], categories: Category[], mood: PortalMood): { product: Product; matched: boolean } | null {
  const cats = new Map(categories.map(category => [category.id, category.name]));
  const candles = products.filter(product =>
    product.status === "published" && (!product.product_type || product.product_type === "candle"));
  if (!candles.length) return null;
  const scored = candles.map((product, index) => {
    const value = [product.name, product.fragrance, product.description,
      product.category_id ? cats.get(product.category_id) : ""].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    const score = terms[mood].reduce((total, term) => total + (value.includes(term) ? 1 : 0), 0);
    return { product, score, index };
  }).sort((a,b) => b.score - a.score || a.index - b.index);
  return { product: scored[0]!.product, matched: scored[0]!.score > 0 };
}
