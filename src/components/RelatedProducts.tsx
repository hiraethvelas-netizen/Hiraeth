import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type SuggestedProduct = Pick<Product,
  "id" | "slug" | "name" | "images" | "price" | "sale_price" | "category_id" | "stock">;

export function chooseRelatedProducts(
  available: SuggestedProduct[],
  current: Pick<Product, "id" | "category_id">,
  max = 4,
): SuggestedProduct[] {
  const possible = available.filter(item =>
    item.id !== current.id && item.stock > 0 && item.slug && item.name);
  const sameUniverse = possible.filter(item =>
    Boolean(current.category_id) && item.category_id === current.category_id);
  const otherUniverses = possible.filter(item =>
    !sameUniverse.some(related => related.id === item.id));
  return [...sameUniverse, ...otherUniverses].slice(0, max);
}

export function RelatedProducts({ product }: { product: Pick<Product, "id" | "category_id"> }) {
  const [related, setRelated] = useState<SuggestedProduct[]>([]);

  useEffect(() => {
    let active = true;
    setRelated([]);
    async function load() {
      try {
        const { data, error } = await supabase.from("products")
          .select("id,slug,name,images,price,sale_price,category_id,stock")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(60);
        if (!active || error) return;
        setRelated(chooseRelatedProducts((data ?? []) as SuggestedProduct[], product));
      } catch {
        // The product itself must remain usable if recommendations are unavailable.
      }
    }
    void load();
    return () => { active = false; };
  }, [product.id, product.category_id]);

  if (!related.length) return null;

  return (
    <section className="mt-12 border-t border-primary/25 pt-8 sm:mt-16 sm:pt-10"
      aria-label="Outras Chamas para Descobrir">
      <div className="mb-6 sm:mb-8">
        <h2 className="font-display text-3xl text-foreground sm:text-4xl">
          Outras Chamas para Descobrir
        </h2>
      </div>
      <div className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 sm:gap-5"
        role="region" aria-label="Deslize para ver outras chamas" tabIndex={0}
        data-testid="related-products">
        {related.map(item => (
          <Link key={item.id} to="/produto/$slug" params={{ slug: item.slug }}
            className="group block w-[44vw] max-w-[220px] min-w-[150px] shrink-0 snap-start text-center sm:w-[210px]">
            <div className="relative aspect-square w-full overflow-hidden bg-transparent">
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.name} loading="lazy"
                  className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs italic text-muted-foreground">
                  Foto em breve
                </div>
              )}
            </div>
            <h3 className="mt-3 break-words font-display text-base leading-snug text-foreground sm:text-lg">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-foreground">{brl(Number(item.sale_price ?? item.price))}</p>
            {item.sale_price != null && (
              <p className="text-xs text-muted-foreground line-through">{brl(Number(item.price))}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
