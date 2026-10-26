import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";


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


function Loja() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  
useEffect(() => {
  async function load() {
    const [{ data: prods }, { data: cats }] =
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
      ]);

    setProducts(prods ?? []);
    setCategories(cats ?? []);

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