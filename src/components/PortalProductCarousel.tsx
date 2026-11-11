import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  loadPortalProductCollection,
  MAX_PORTAL_PRODUCTS,
  PORTAL_PRODUCTS_CHANGED,
  type PortalCatalogProduct,
} from "@/lib/portal-products";

type CollectionState = {
  portalId: string;
  status: "loading" | "ready" | "error";
  configured: boolean;
  products: PortalCatalogProduct[];
};

type Props = { portalId: string; catalogUrl: string; fallback?: ReactNode };

/** Product photos and destinations always come from the published store listing. */
export function PortalProductCarousel({ portalId, catalogUrl, fallback }: Props) {
  const headingId = useId();
  const galleryRef = useRef<HTMLDivElement>(null);
  const [reload, setReload] = useState(0);
  const [collection, setCollection] = useState<CollectionState>({
    portalId,
    status: "loading",
    configured: false,
    products: [],
  });

  useEffect(() => {
    let active = true;
    let request = 0;
    setCollection({ portalId, status: "loading", configured: false, products: [] });
    async function load() {
      const version = ++request;
      try {
        const result = await loadPortalProductCollection(portalId);
        if (!active || version !== request) return;
        const seen = new Set<string>();
        const products = result.products
          .filter((product) => {
            if (
              seen.has(product.id) ||
              product.status !== "published" ||
              product.product_type === "artifact"
            )
              return false;
            seen.add(product.id);
            return true;
          })
          .slice(0, MAX_PORTAL_PRODUCTS);
        setCollection({ portalId, status: "ready", configured: result.configured, products });
      } catch {
        if (active && version === request) {
          setCollection({ portalId, status: "error", configured: false, products: [] });
        }
      }
    }
    void load();
    const refresh = () => {
      void load();
    };
    const changed = (event: Event) => {
      if ((event as CustomEvent<{ portalId?: string }>).detail?.portalId === portalId) {
        void load();
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(PORTAL_PRODUCTS_CHANGED, changed);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(PORTAL_PRODUCTS_CHANGED, changed);
    };
  }, [portalId, reload]);

  const current = collection.portalId === portalId ? collection : null;
  if (current?.status === "ready" && !current.configured && fallback !== undefined) {
    return <>{fallback}</>;
  }

  function scroll(direction: -1 | 1) {
    const gallery = galleryRef.current;
    if (!gallery) return;
    gallery.scrollBy({
      left: direction * Math.min((gallery.clientWidth || 280) * 0.9, 640),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div
      role="region"
      aria-labelledby={headingId}
      className="portal-collection-frame mx-auto max-w-6xl px-5 py-10 text-[var(--portal-text)] sm:px-8 sm:py-14"
    >
      <header className="portal-collection-heading text-center">
        <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">
          A coleção completa
        </p>
        <h2 id={headingId} className="mt-3 font-display text-3xl md:text-5xl">
          Conheça o acervo
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed opacity-85">
          Escolha uma vela e descubra sua história na loja.
        </p>
        <span className="portal-collection-divider" aria-hidden="true">
          ✦
        </span>
      </header>

      {!current || current.status === "loading" ? (
        <p role="status" className="py-10 text-center text-sm">
          Carregando as velas da coleção...
        </p>
      ) : current.status === "error" ? (
        <div className="py-10 text-center">
          <p role="alert" className="text-sm">
            Não foi possível carregar as velas desta coleção. Tente novamente.
          </p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-5 rounded-full border border-[var(--portal-accent)] px-5 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Tentar carregar as velas novamente
          </button>
        </div>
      ) : current.products.length ? (
        <div className="portal-gallery-shell mt-9 min-w-0 max-w-full">
          <div
            ref={galleryRef}
            role="region"
            aria-label="Velas publicadas da coleção"
            tabIndex={0}
            className="portal-gallery-viewport flex gap-4 overflow-x-auto pb-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--portal-accent)]"
          >
            {current.products.map((product) => (
              <a
                key={product.id}
                href={`/produto/${encodeURIComponent(product.slug)}`}
                aria-label={`Ver ${product.name} na loja`}
                className="portal-gallery-photo block w-52 shrink-0 snap-start rounded-md border border-[var(--portal-accent)]/50 p-3 text-center text-[var(--portal-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--portal-accent)] sm:w-60"
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="aspect-[4/5] w-full rounded object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex aspect-[4/5] w-full items-center justify-center rounded border border-[var(--portal-accent)]/20 px-4 text-sm">
                    Foto em breve
                  </span>
                )}
                <h3 className="mt-4 font-display text-xl">{product.name}</h3>
              </a>
            ))}
          </div>
          {current.products.length > 1 && (
            <div className="portal-gallery-controls mt-5 flex justify-center gap-3">
              <button
                type="button"
                aria-label="Ver velas anteriores da coleção"
                onClick={() => scroll(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--portal-accent)] text-[var(--portal-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Ver próximas velas da coleção"
                onClick={() => scroll(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--portal-accent)] text-[var(--portal-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mx-auto max-w-lg py-10 text-center text-sm leading-relaxed opacity-85">
          As velas desta coleção serão apresentadas aqui em breve.
        </p>
      )}

      <a
        href={catalogUrl}
        className="portal-collection-shop-link mx-auto mt-9 inline-flex items-center justify-center gap-3 rounded border border-[var(--portal-accent)] px-5 py-3 text-center text-[var(--portal-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Ver a coleção completa <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  );
}
