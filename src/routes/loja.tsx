import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";


type Product = Tables<"products">;
type Category = Tables<"categories">;

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "O Acervo Hiraeth" },
      {
        name: "description",
        content: "Explore o Acervo Hiraeth: velas literárias e camisetas inspiradas nos universos que moram em você.",
      },
      { property: "og:title", content: "O Acervo Hiraeth" },
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
  const [pageSettings, savePageSettings] = useSiteContent("store-page-settings", { eyebrow: "O Acervo Hiraeth", title: "O Acervo Hiraeth", intro: "Encontre o universo que mora em você.", bannerImage: "", showBanner: false });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  async function saveProduct(product: Product, values: Record<string, unknown>) {
    const payload = { name: String(values["name"] ?? product.name), description: String(values["description"] ?? "") || null, price: Number(values["price"] ?? product.price), sale_price: values["sale_price"] === "" || values["sale_price"] == null ? null : Number(values["sale_price"]), fragrance: String(values["fragrance"] ?? "") || null, images: Array.isArray(values["images"]) ? values["images"] as string[] : product.images };
    const { error } = await supabase.from("products").update(payload).eq("id", product.id);
    if (error) throw error;
    setProducts(current => current.map(item => item.id === product.id ? { ...item, ...payload } : item));
  }

  
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
    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) setQuery(initialQuery);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const categoryIsInPeriod = (category: Category) => !category.is_temporary
      || Boolean(category.starts_at && category.ends_at && category.starts_at <= today && category.ends_at >= today);
    const allCategories = (cats ?? []) as Category[];
    const activeCategories = allCategories.filter((category) => {
      if (!categoryIsInPeriod(category)) return false;
      if (!category.parent_id) return true;
      const parent = allCategories.find((item) => item.id === category.parent_id);
      return Boolean(parent && categoryIsInPeriod(parent));
    });
    setCategories(activeCategories);

    // Permite abrir a loja diretamente em uma categoria usando /loja?categoria=slug.
    const categorySlug = new URLSearchParams(window.location.search).get("categoria");
    if (categorySlug) {
      const selectedCategory = (cats ?? []).find((category) => category.slug === categorySlug);
      if (selectedCategory) setCategoryId(selectedCategory.id);
    }

    setLoading(false);
  }

  load();
}, []);


  const filtered = useMemo(() => {
    const activeCategoryIds = new Set(categories.map((category) => category.id));
    return products.filter((p) => {
      if (p.category_id && !activeCategoryIds.has(p.category_id)) return false;
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
  }, [products, query, categoryId, categories]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
        {/* Catálogo da loja */}
        <div className="mb-5 space-y-3">
          <InlineEditor label="apresentação da loja" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "intro", label: "Texto de apresentação", type: "textarea" }, { name: "bannerImage", label: "Banner opcional", type: "image" }, { name: "showBanner", label: "Exibir banner", type: "checkbox" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>
        {pageSettings.showBanner && pageSettings.bannerImage && <img src={pageSettings.bannerImage} alt="Banner da loja Hiraeth" className="mb-8 max-h-[28rem] w-full object-cover" />}
        <p className="eyebrow">{pageSettings.eyebrow}</p>
        <h1 className="mt-2 text-4xl text-foreground md:text-5xl">{pageSettings.title}</h1>
        {pageSettings.intro && <p className="mt-3 max-w-2xl text-muted-foreground">{pageSettings.intro}</p>}

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
                onClick={() => {
                  const nextId = c.id === categoryId ? null : c.id;
                  setCategoryId(nextId);
                  const url = new URL(window.location.href);
                  if (nextId) url.searchParams.set("categoria", c.slug);
                  else url.searchParams.delete("categoria");
                  window.history.replaceState({}, "", url.toString());
                }}
                className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${
                  categoryId === c.id
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <span>{c.name}</span>
                {c.is_temporary && c.ends_at && <span className="ml-2 inline-flex flex-col items-start gap-0.5 normal-case tracking-normal">
                  <span className="border border-amber-500/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-600">Temporária</span>
                  <span className="text-[10px] text-amber-700/90">Até {new Date(c.ends_at + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </span>}
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
                  <InlineEditor
                    label={`produto ${p.name}`}
                    fields={[
                      { name: "name", label: "Nome", type: "text" },
                      { name: "description", label: "Descrição", type: "textarea" },
                      { name: "price", label: "Preço", type: "text" },
                      { name: "sale_price", label: "Preço promocional", type: "text" },
                      { name: "fragrance", label: "Fragrância", type: "text" },
                      { name: "images", label: "Imagens do produto", type: "images" },
                    ]}
                    values={{ name: p.name, description: p.description ?? "", price: String(p.price), sale_price: p.sale_price == null ? "" : String(p.sale_price), fragrance: p.fragrance ?? "", images: p.images ?? [] }}
                    onSave={(values) => saveProduct(p, values)}
                  />
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