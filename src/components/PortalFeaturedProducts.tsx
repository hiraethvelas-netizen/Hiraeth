import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { portalFeaturedProductIds } from "@/lib/portal-featured-products";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Props = { theme: unknown };

export function PortalFeaturedProducts({ theme }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
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

  function scroll(direction: -1 | 1) {
    const element = scroller.current;
    if (element) element.scrollBy({ left: direction * Math.min(element.clientWidth * 0.8, 420), behavior: "smooth" });
  }

  if (!loading && products.length === 0) return null;

  return <section className="portal-featured-products relative z-10 mx-auto mt-9 max-w-5xl rounded-2xl border border-[#c6a65b]/45 bg-[#121f27]/90 px-4 py-7 shadow-xl sm:px-7 sm:py-9"
    aria-label="Velas em destaque do Acervo Hiraeth">
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[.24em] text-[#e1c48e]">Seleção da Guardiã</p>
        <h3 className="mt-2 font-display text-2xl italic text-[#f7efda] sm:text-3xl">Chamas para descobrir</h3>
        <p className="mt-2 text-xs leading-relaxed text-[#f7efda]/80 sm:text-sm">Deslize pelas velas e toque em uma para conhecê-la no Acervo.</p>
      </div>
      {products.length > 1 && <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="Ver velas anteriores" className="rounded-full border border-[#d3b575]/60 p-2 text-[#f7efda]"><ArrowLeft size={17} /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Ver próximas velas" className="rounded-full border border-[#d3b575]/60 p-2 text-[#f7efda]"><ArrowRight size={17} /></button>
      </div>}
    </div>
    {loading ? <p role="status" className="py-8 text-center text-sm text-[#f7efda]/70">Reunindo as velas do Acervo...</p> :
      <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] sm:gap-4"
        role="region" aria-label="Velas do Acervo para deslizar horizontalmente">
        {products.map(product => <Link key={product.id} to="/produto/$slug" params={{ slug: product.slug }}
          className="group w-[45%] min-w-[134px] max-w-[190px] shrink-0 snap-start rounded-xl border border-[#c6a65b]/25 bg-[#24313a] p-3 text-center transition-colors hover:border-[#e7c785] sm:w-[30%]"
          aria-label={"Conhecer vela " + product.name}>
          <span className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-[#f7efda]/[.06] p-2">
            {product.images?.[0] ? <img src={product.images[0]} alt={product.name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              : <span className="text-sm italic text-[#f7efda]/70">Foto em breve</span>}
          </span>
          <span className="mt-3 block min-h-[2.5rem] font-display text-lg leading-tight text-[#f7efda]">{product.name}</span>
          <span className="mt-2 block text-[10px] uppercase tracking-widest text-[#e1c48e]">Conhecer a vela</span>
        </Link>)}
      </div>}
  </section>;
}
