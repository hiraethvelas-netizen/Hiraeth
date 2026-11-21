import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ArrowUpRight, Waves } from "lucide-react";

type Product = Pick<Tables<"products">, "id" | "name" | "slug" | "images" | "product_type">;

/**
 * The catalog remains unmounted until the Summer portal's show_catalog flag is
 * explicitly enabled. Never substitute unrelated store products for this portal.
 * Admins link each summer candle to the portal in the product editor.
 */
export function SummerPortalCatalog({ portalId, catalogUrl }: { portalId: string; catalogUrl: string | null }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const { data, error: queryError } = await supabase.from("products")
          .select("id,name,slug,images,product_type")
          .eq("portal_id", portalId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(16);
        if (queryError) throw queryError;
        if (!active) return;
        setProducts((data ?? []).filter(item => !item.product_type || item.product_type === "candle"));
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [portalId, attempt]);

  return <section className="summer-catalog summer-content-section" id="acervo-de-verao" aria-labelledby="summer-catalog-title">
    <Waves aria-hidden="true" size={32} />
    <p className="summer-eyebrow">Coleção Hiraeth</p>
    <h2 id="summer-catalog-title">Conheça as <em>chamas do verão</em></h2>
    {loading ? <p role="status" className="summer-catalog-status">Reunindo as chamas desta estação...</p>
      : error ? <div className="summer-catalog-status">
        <p role="alert">Não foi possível carregar o acervo agora.</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}
          className="summer-catalog-retry">Tentar novamente</button>
      </div>
      : products.length > 0 ? <div className="summer-catalog-grid" aria-label="Velas da coleção de verão">
        {products.map(product => <Link to="/produto/$slug" params={{ slug: product.slug }} key={product.id}
          className="summer-catalog-card" aria-label={`Conhecer vela ${product.name}`}>
          <span className="summer-catalog-photo">
            {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" />
              : <span>Foto em breve</span>}
          </span>
          <strong>{product.name}</strong>
          <span className="summer-catalog-more">Conheça esta chama <ArrowUpRight size={15} aria-hidden="true" /></span>
        </Link>)}
      </div> : <p className="summer-catalog-status">Novas chamas estão a caminho. Volte para descobrir cada uma delas.</p>}
    {catalogUrl && <a href={catalogUrl} className="summer-catalog-link">
      Explore o acervo completo <ArrowUpRight size={18} aria-hidden="true" />
    </a>}
  </section>;
}
