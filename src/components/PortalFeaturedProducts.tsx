import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { portalFeaturedProductIds } from "@/lib/portal-featured-products";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Props = { theme: unknown };

export function PortalFeaturedProducts({ theme }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedIds = portalFeaturedProductIds(theme);
  const selectionKey = selectedIds.join(",");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from("products").select("*")
          .eq("status", "published").order("created_at", { ascending: false });
        if (error) throw error;
        if (!active) return;
        // Nunca mostrar produtos arquivados, rascunhos ou artefatos neste carrossel.
        const candles = (data ?? []).filter(item => !item.product_type || item.product_type === "candle");
        const byId = new Map(candles.map(product => [product.id, product]));
        const selected = selectedIds.length
          ? selectedIds.map(id => byId.get(id)).filter((item): item is Product => Boolean(item))
          : candles.slice(0, 5);
        setProducts(selected);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  return <section id="portal-acervo" className="portal-featured-products relative mx-auto w-full max-w-6xl px-5 py-12 text-center sm:px-8 sm:py-16"
    aria-label="Velas em destaque do Acervo Hiraeth">
    <h2 className="portal-script-title text-center text-[#f7efda]">Conheça o Acervo</h2>
    {loading ? <p role="status" className="mt-8 py-6 text-sm text-[#f7efda]/70">Reunindo as velas do Acervo...</p> :
      products.length > 0 ? <div className="portal-featured-products__scroll mt-8 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-5 sm:mt-10 sm:gap-7"
        role="region" aria-label="Velas do Acervo para deslizar horizontalmente">
        {products.map(product => <Link key={product.id} to="/produto/$slug" params={{ slug: product.slug }}
          className="group flex w-[44%] min-w-[130px] max-w-[210px] shrink-0 snap-start flex-col items-center bg-transparent text-center sm:w-[30%] md:w-[23%]"
          aria-label={"Conhecer vela " + product.name}>
          {product.images?.[0] ? <img src={product.images[0]} alt={product.name}
            className="h-[180px] w-full bg-transparent object-contain transition-transform duration-300 group-hover:scale-105 sm:h-[230px]"
            loading="lazy" />
            : <span className="flex h-[180px] w-full items-center justify-center text-sm italic text-[#f7efda]/70 sm:h-[230px]">Foto em breve</span>}
          <span className="mt-3 block font-display text-lg leading-snug text-[#f7efda] sm:text-xl">{product.name}</span>
        </Link>)}
      </div> : <p className="mt-8 text-center text-sm text-[#f7efda]/75">Novas velas chegarão ao Acervo em breve.</p>}
    <a href="/loja"
      className="portal-featured-products__all mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-[#d6b77c] px-7 py-3 text-sm font-medium text-[#f7efda] transition-colors hover:bg-[#d6b77c]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7efda]">
      Conheça o Acervo Completo
    </a>
  </section>;
}
