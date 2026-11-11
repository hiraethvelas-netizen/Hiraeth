import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export const MAX_PORTAL_PRODUCTS = 5;
export const PORTAL_PRODUCTS_CHANGED = "hiraeth:portal-products-updated";
export const portalProductsKey = (portalId: string) => "portal-products-" + portalId;

export type PortalProductSelection = Record<string, unknown> & { productIds: string[] };
export type PortalCatalogProduct = Pick<
  Tables<"products">,
  "id" | "name" | "slug" | "images" | "status" | "product_type"
>;

export function portalProductSelection(value: unknown): PortalProductSelection {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    ...record,
    productIds: Array.isArray(record["productIds"])
      ? [
          ...new Set(
            record["productIds"].filter(
              (id): id is string => typeof id === "string" && Boolean(id.trim()),
            ),
          ),
        ]
      : [],
  };
}

export async function loadPortalProductCollection(portalId: string) {
  const { data: content, error: contentError } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", portalProductsKey(portalId))
    .maybeSingle();
  if (contentError) throw new Error("Não foi possível carregar as velas desta coleção.");
  const selection = portalProductSelection(content?.value);
  if (!selection.productIds.length) {
    return { configured: Boolean(content), products: [] as PortalCatalogProduct[] };
  }
  const ids = selection.productIds;
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,images,status,product_type")
    .eq("status", "published")
    .in("id", ids);
  if (error) throw new Error("Não foi possível carregar as velas desta coleção.");
  const products = ids
    .flatMap((id) => {
      const product = data?.find(
        (item) => item.id === id && item.status === "published" && item.product_type !== "artifact",
      );
      return product ? [product] : [];
    })
    .slice(0, MAX_PORTAL_PRODUCTS);
  return { configured: Boolean(content), products };
}

/** Update only the selection, using a fresh read and a compare-and-set write. */
export async function setPortalProductSelected(
  portalId: string,
  productId: string,
  selected: boolean,
): Promise<PortalProductSelection> {
  const key = portalProductsKey(portalId);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error("Não foi possível consultar a seleção do portal. Tente novamente.");
    const previous = portalProductSelection(data?.value);
    const hasProduct = previous.productIds.includes(productId);
    if (hasProduct === selected) return previous;
    if (selected && previous.productIds.length >= MAX_PORTAL_PRODUCTS) {
      throw new Error(
        "Este portal já tem cinco velas. Retire uma seleção antes de adicionar outra.",
      );
    }
    const next: PortalProductSelection = {
      ...previous,
      productIds: selected
        ? [...previous.productIds, productId]
        : previous.productIds.filter((id) => id !== productId),
    };
    const row = { key, value: next as Json, updated_at: new Date().toISOString() };
    const result = data
      ? await supabase
          .from("site_content")
          .update(row)
          .eq("key", key)
          .eq("value", JSON.stringify(data.value))
          .select("key")
      : await supabase.from("site_content").insert(row).select("key");
    if (result.error) {
      if (!data && result.error.code === "23505") continue;
      throw new Error("Não foi possível salvar a seleção do portal. Tente novamente.");
    }
    if (!result.data?.length) continue;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PORTAL_PRODUCTS_CHANGED, { detail: { portalId } }));
    }
    return next;
  }
  throw new Error("A seleção foi alterada em outra edição. Atualize a lista e tente novamente.");
}
