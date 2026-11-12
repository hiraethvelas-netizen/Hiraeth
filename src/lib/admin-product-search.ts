import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories"> & { parent_id?: string | null };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

/** Pesquisa somente os produtos carregados no painel e preserva a ordem original. */
export function filterAdminProducts(
  products: Product[],
  categories: Category[],
  query: string,
  status: string = "all",
): Product[] {
  const needle = normalize(query.trim());
  const byId = new Map(categories.map(category => [category.id, category]));
  return products.filter(product => {
    if (status !== "all" && product.status !== status) return false;
    if (!needle) return true;
    const category = product.category_id ? byId.get(product.category_id) : undefined;
    const parent = category?.parent_id ? byId.get(category.parent_id) : undefined;
    const haystack = [product.name, product.sku, product.fragrance, product.slug,
      category?.name, parent?.name, product.status]
      .filter(Boolean).join(" ");
    return normalize(haystack).includes(needle);
  });
}
