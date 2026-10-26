import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

import portalImage from "@/assets/opening-portal.jpg";
import forestImage from "@/assets/opening-forest.jpg";
import phoenixImage from "@/assets/opening-phoenix.png";
import bannerImage from "@/assets/banner-portal.png";

type Product = Tables<"products">;
type Category = Tables<"categories">;

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja — Hiraeth" },
      {
        name: "description",
        content: "Catálogo de velas literárias e camisetas Hiraeth.",
      },
      { property: "og:title", content: "Loja — Hiraeth" },
      {
        property: "og:description",
        content:
          "Velas literárias e camisetas inspiradas nos universos que moram em você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Loja,
});


type Shortcut = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  image_key: string;
  position: number;
  active: boolean;
};

const shortcutImages: Record<string, string> = {
  forest: forestImage,
  portal: portalImage,
  phoenix: phoenixImage,
  banner: bannerImage,
};

function Loja() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
const [shortcutsLoading, setShortcutsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  
useEffect(() => {
  async function load() {
    const [{ data: prods }, { data: cats }, { data: shortcutData, error: shortcutError }] =
      await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("visible", true)
          .order("position"),
        (supabase as any)
          .from("site_shortcuts")
          .select("*")
          .eq("active", true)
          .order("position", { ascending: true }),
      ]);

    setProducts(prods ?? []);
    setCategories(cats ?? []);

    if (shortcutError) {
      console.error("Erro ao carregar atalhos:", shortcutError.message);
      setShortcuts([]);
    } else {
      setShortcuts((shortcutData ?? []) as Shortcut[]);
    }

    setShortcutsLoading(false);
    setLoading(false);
  }

  load();
}, []);


  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId && p.category_id !== categoryId) return false;

      if (query) {
        const q = query.toLowerCase();

        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.fragrance ?? "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, query, categoryId]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
        {/* Atalhos circulares */}
        <nav
          aria-label="Navegação principal"
          className="mb-12 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-6 md:mb-16 md:gap-8"
        >
          {!shortcutsLoading &&
  shortcuts.map((item) => (
    <Link
      key={item.id}
      to={item.href as any}
      className="group flex flex-col items-center text-center"
    >
      <div className="relative aspect-square w-full max-w-[150px] overflow-hidden rounded-full border border-primary/40 bg-card shadow-md transition-all duration-500 group-hover:scale-[1.04] group-hover:border-primary group-hover:shadow-[var(--glow)] md:max-w-[180px]">
        <img
          src={shortcutImages[item.image_key] ?? portalImage}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/0" />
      </div>

      <span className="mt-3 font-display text-base text-foreground transition-colors group-hover:text-primary sm:text-lg">
        {item.title}
      </span>

      <span className="mt-1 max-w-[180px] text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {item.description}
      </span>
    </Link>
  ))}
        </nav>

        {/* Catálogo da loja */}
        <p className="eyebrow">O acervo</p>
        <h1 className="mt-2 text-4xl text-foreground md:text-5xl">
          Loja
        </h1>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <input
            type="search"
            placeholder="Buscar por nome, fragrância, universo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryId(null)}
              className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
                categoryId === null
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Todos
            </button>

            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setCategoryId(c.id === categoryId ? null : c.id)
                }
                className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
                  categoryId === c.id
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-16 text-center text-muted-foreground">
            Abrindo o acervo...
          </p>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-display text-2xl italic text-primary">
              Nenhum item encontrado
            </p>
            <p className="mt-2 text-muted-foreground">
              {products.length === 0
                ? "O acervo ainda está sendo preparado. Volte em breve."
                : "Tente outra busca ou categoria."}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="group border bg-card transition-shadow hover:shadow-[var(--glow)]"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-lg italic text-muted-foreground">
                      Foto em breve
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h2 className="text-2xl text-foreground">{p.name}</h2>

                  {p.fragrance && (
                    <p className="mt-1 text-sm italic text-muted-foreground">
                      {p.fragrance}
                    </p>
                  )}

                  <div className="mt-3 flex items-baseline gap-2">
                    {p.sale_price != null ? (
                      <>
                        <span className="text-lg text-primary">
                          {brl(Number(p.sale_price))}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {brl(Number(p.price))}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg text-primary">
                        {brl(Number(p.price))}
                      </span>
                    )}
                  </div>

                  {p.stock <= 0 && (
                    <p className="mt-2 text-xs uppercase tracking-widest text-destructive">
                      Esgotado
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}