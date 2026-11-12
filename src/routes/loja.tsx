import { activeCategories } from "@/lib/store-categories";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";
import { useCollectionVisibility } from "@/hooks/use-collection-visibility";
import { StoreBanners } from "@/components/StoreBanners";
import { AcervoNavigation } from "@/components/AcervoNavigation";
import { CustomerReviews } from "@/components/CustomerReviews";
import { SecretFlamesPromotion } from "@/components/SecretFlamesPromotion";
import { CuratedProductGrid } from "@/components/CuratedProductGrid";
import { useStorePromotions } from "@/lib/use-store-promotions";
import { visiblePrice } from "@/lib/store-pricing";
import { CategoryHeroBanner } from "@/components/CategoryHeroBanner";
import { Heart, Shirt } from "lucide-react";
import { toast } from "sonner";
import { requireAuthenticatedUser } from "@/lib/require-auth";


type Product = Tables<"products">;
type Category = Tables<"categories">;

export const Route = createFileRoute("/loja")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(typeof search["categoria"] === "string" ? { categoria: search["categoria"] } : {}),
    ...(search["favoritos"] === "1" ? { favoritos: "1" } : {}),
  }),
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


function filteredProductsForApparel(products: Product[], categories: Category[]) {
  return products.filter((product) => {
    const category = categories.find((item) => item.id === product.category_id);
    return /camiseta|t-shirt|roupa|vestuário/i.test(`${product.name} ${category?.name ?? ""}`);
  });
}

function Loja() {
  const search = Route.useSearch();
  const showFavorites = search.favoritos === "1";
  const navigate = useNavigate();
  const { editing } = useAdminEdit();
  const collectionVisibility = useCollectionVisibility();
  const [pageSettings, savePageSettings] = useSiteContent("store-page-settings", { eyebrow: "O Acervo Hiraeth", title: "O Acervo Hiraeth", intro: "Encontre o universo que mora em você.", bannerImage: "", showBanner: false });
  const [products, setProducts] = useState<Product[]>([]);
  const { promotions: automaticPromotions, categories: promotionCategories } = useStorePromotions();
  const [categories, setCategories] = useState<Category[]>([]);
const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [enteringCategory, setEnteringCategory] = useState<Category | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistUserId, setWishlistUserId] = useState<string | null>(null);

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
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      setWishlistUserId(authData.user.id);
      const { data: saved } = await supabase.from("wishlist_items").select("product_id").eq("user_id", authData.user.id);
      setWishlistIds(new Set((saved ?? []).map((item) => item.product_id)));
    }
    setCategories(activeCategories((cats ?? []) as Category[]));

    setLoading(false);
  }

  load();
}, []);

useEffect(() => {
  let active = true;
  async function refresh() {
    const { data, error } = await supabase.from("categories").select("*").eq("visible", true).order("position");
    if (active && !error) setCategories(activeCategories((data ?? []) as Category[]));
  }
  const listener = () => { void refresh(); };
  window.addEventListener("focus", listener);
  window.addEventListener("hiraeth:categories-updated", listener);
  const timer = window.setInterval(listener, 15000);
  return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", listener); window.removeEventListener("hiraeth:categories-updated", listener); };
}, []);

useEffect(() => {
  setQuery(search.q ?? "");
}, [search.q]);

useEffect(() => {
  const selected = categories.find((category) => category.slug === search.categoria);
  setCategoryId(selected?.id ?? null);
}, [categories, search.categoria]);

  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null;
  async function toggleWishlist(productId: string, event: React.MouseEvent) {
    event.preventDefault(); event.stopPropagation();
    if (!wishlistUserId) { toast.info("Entre na sua conta para salvar seus favoritos."); return; }
    const alreadySaved = wishlistIds.has(productId);
    const result = alreadySaved
      ? await supabase.from("wishlist_items").delete().eq("user_id", wishlistUserId).eq("product_id", productId)
      : await supabase.from("wishlist_items").insert({ user_id: wishlistUserId, product_id: productId });
    if (result.error) { toast.error("Não foi possível atualizar seus favoritos."); return; }
    setWishlistIds(current => { const next = new Set(current); if (alreadySaved) next.delete(productId); else next.add(productId); return next; });
    toast.success(alreadySaved ? "Removido dos favoritos." : "Adicionado aos favoritos.");
  }
  const featuredCollectionSlugs = ["harry-potter", "universo-sarah-j-maas", "friends", "the-vampire-diaries", "crepusculo", "taylor-swift", "gilmore-girls"];
  const featuredCollections = [
    ...featuredCollectionSlugs.map((slug) => categories.find((category) => category.slug === slug)).filter((category): category is Category => Boolean(category)),
    ...categories.filter(category => category.parent_id && !featuredCollectionSlugs.includes(category.slug)),
  ];
  const visibleCollections = collectionVisibility.settings?.showSection && !collectionVisibility.loading && !collectionVisibility.error
    ? featuredCollections.filter(category => collectionVisibility.settings!.visibleCategoryIds === null || collectionVisibility.settings!.visibleCategoryIds.includes(category.id))
    : [];
  const apparelProducts = !categoryId && !showFavorites ? filteredProductsForApparel(products, categories) : [];

  const filtered = useMemo(() => {
    const activeCategoryIds = new Set(categories.map((category) => category.id));
    return products.filter((p) => {
      if (showFavorites && !wishlistIds.has(p.id)) return false;
      if (p.category_id && !activeCategoryIds.has(p.category_id)) return false;
      if (categoryId) {
        const includedCategoryIds = new Set([categoryId, ...categories.filter((category) => category.parent_id === categoryId).map((category) => category.id)]);
        if (!p.category_id || !includedCategoryIds.has(p.category_id)) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        const categoryName = categories.find((category) => category.id === p.category_id)?.name ?? "";

        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.fragrance ?? "").toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, query, categoryId, categories, wishlistIds, showFavorites]);

  useEffect(() => {
    if (loading || typeof IntersectionObserver === "undefined") return;
    const cards = document.querySelectorAll<HTMLElement>(".hiraeth-product-card[data-product-badge], .hiraeth-featured-flame");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.42, rootMargin: "0px 0px -8% 0px" });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [loading, filtered.length]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {!showFavorites && <AcervoNavigation />}
      {!selectedCategory && !showFavorites && <StoreBanners />}

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
        {showFavorites && <section className="mb-8 text-center">
          <h1 className="font-display text-4xl text-foreground md:text-5xl">Meus Favoritos</h1>
          <p className="mt-3 text-sm text-muted-foreground">Os produtos que você guardou no coração.</p>
          <Link to="/loja" className="mt-4 inline-block text-sm text-primary underline underline-offset-4">Voltar ao Acervo Hiraeth</Link>
        </section>}
        {/* Catálogo da loja */}
        {!selectedCategory && !showFavorites && <div className="mb-5 space-y-3">
          <InlineEditor label="apresentação da loja" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "intro", label: "Texto de apresentação", type: "textarea" }, { name: "bannerImage", label: "Banner opcional", type: "image" }, { name: "showBanner", label: "Exibir banner", type: "checkbox" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>}
        {!selectedCategory && !showFavorites && pageSettings.showBanner && pageSettings.bannerImage && <img src={pageSettings.bannerImage} alt="Banner da loja Hiraeth" className="mb-8 max-h-[28rem] w-full object-cover" />}

        {selectedCategory && <CategoryHeroBanner
          key={"category-banner-" + selectedCategory.id}
          category={selectedCategory}
          onNameChange={async name => {
            const { error } = await supabase.from("categories").update({ name }).eq("id", selectedCategory.id);
            if (error) throw error;
            setCategories(current => current.map(item => item.id === selectedCategory.id ? { ...item, name } : item));
          }}
        />}

        {!categoryId && !showFavorites && editing && <div className="mt-6 space-y-2">
          {loading || collectionVisibility.loading ? <p role="status" className="text-sm text-muted-foreground">Carregando opções das bolinhas...</p>
            : collectionVisibility.error ? <div>
              <p role="alert" className="text-sm text-destructive">Não foi possível carregar as opções das bolinhas.</p>
              <button type="button" onClick={collectionVisibility.retry} className="mt-2 rounded border border-primary/40 px-3 py-2 text-sm text-primary">Tentar carregar as opções novamente</button>
            </div> : collectionVisibility.settings && <>
              <InlineEditor label="bolinhas de subcategorias"
                fields={[
                  { name: "showSection", label: "Exibir a área das bolinhas para os clientes", type: "checkbox" },
                  { name: "circleLayout", label: "Posição das bolinhas", type: "select", options: [
                    { value: "center", label: "Centralizadas" },
                    { value: "two", label: "Duas por fileira" },
                  ] },
                  ...featuredCollections.map(category => ({ name: "collection-" + category.id, label: "Exibir bolinha de " + category.name, type: "checkbox" as const })),
                ]}
                values={{ showSection: collectionVisibility.settings.showSection, circleLayout: collectionVisibility.settings["circleLayout"] === "two" ? "two" : "center", ...Object.fromEntries(featuredCollections.map(category => ["collection-" + category.id, collectionVisibility.settings!.visibleCategoryIds === null || collectionVisibility.settings!.visibleCategoryIds.includes(category.id)])) }}
                onSave={async values => {
                  const settings = collectionVisibility.settings!;
                  const selected = new Set(settings.visibleCategoryIds ?? featuredCollections.map(category => category.id));
                  let changed = false;
                  for (const category of featuredCollections) {
                    const show = values["collection-" + category.id];
                    if (typeof show !== "boolean") continue;
                    if (show !== selected.has(category.id)) changed = true;
                    if (show) selected.add(category.id); else selected.delete(category.id);
                  }
                  const newLayout = values["circleLayout"] === "two" ? "two" : "center";
                  const previousLayout = settings["circleLayout"] === "two" ? "two" : "center";
                  await collectionVisibility.save({ ...settings,
                    showSection: values["showSection"] === true,
                    visibleCategoryIds: settings.visibleCategoryIds === null && !changed ? null : [...selected],
                    ...(newLayout !== previousLayout ? { circleLayout: newLayout } : {}),
                  });
                }} />
              <p className="text-xs text-muted-foreground">Escolha quais bolinhas os clientes verão. Ocultar uma bolinha não altera a categoria, os produtos ou o menu do acervo.</p>
            </>}
        </div>}

        {!categoryId && !showFavorites && visibleCollections.length > 0 && <section className="mt-8" aria-label="Coleções em destaque">
          <div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="eyebrow">{pageSettings.eyebrow}</p><h2 className="hiraeth-editorial-title hiraeth-acervo-heading !mx-0 mt-2 !text-left !text-4xl md:!text-6xl">{pageSettings.title}</h2>{pageSettings.intro && <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{pageSettings.intro}</p>}</div><span className="shrink-0 text-xs text-muted-foreground">{visibleCollections.length} {visibleCollections.length === 1 ? "universo" : "universos"}</span></div>
          <div className={collectionVisibility.settings?.["circleLayout"] === "two"
            ? "mx-auto grid w-full max-w-[540px] grid-cols-2 items-start gap-3 sm:gap-5"
            : "flex flex-wrap items-start justify-center gap-3 sm:gap-5"}>
            {visibleCollections.map((collection) => <div key={collection.id} className={
              "flex min-w-0 flex-col items-center gap-2 " +
              (collectionVisibility.settings?.["circleLayout"] === "two"
                ? "w-full"
                : "w-[calc(50%-0.375rem)] max-w-[230px] sm:w-[calc(33.33%-0.875rem)]")
            }>
              <button type="button" aria-label={collection.name} onClick={() => { const enter = () => { setCategoryId(collection.id); void navigate({ to: "/loja", search: { ...(search.q ? { q: search.q } : {}), categoria: collection.slug }, replace: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }; if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) enter(); else { setEnteringCategory(collection); window.setTimeout(() => { enter(); setEnteringCategory(null); }, 620); } }} className="hiraeth-collection-card group relative aspect-square w-full overflow-hidden rounded-full text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className="absolute inset-0 bg-muted">{collection.image_url ? <img src={collection.image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-card to-muted text-3xl text-primary" aria-hidden="true">✦</div>}</div>
                <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"
                  className="hiraeth-collection-arc pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  aria-hidden="true">
                  <defs><path id={`hiraeth-circle-${collection.id}`} d="M 17 131 A 85 85 0 0 0 183 131" /></defs>
                  <text className="hiraeth-collection-arc__text">
                    <textPath href={`#hiraeth-circle-${collection.id}`} startOffset="50%" textAnchor="middle">{collection.name}</textPath>
                  </text>
                </svg>
                {collection.is_temporary && <span className="absolute right-2 top-3 rounded-full border border-amber-100/75 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-50">Temporária</span>}
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:shadow-[inset_0_0_35px_rgba(198,166,91,0.55)]" />
              </button>
              <InlineEditor label={`bolinha de ${collection.name}`} fields={[{ name: "image_url", label: "Imagem da bolinha", type: "image", help: "Envie JPG, PNG ou WebP, até 5 MB. A imagem será atualizada na bolinha desta coleção." }]} values={{ image_url: collection.image_url ?? "" }} onSave={async (values) => {
                const image_url = String(values["image_url"] ?? "").trim() || null;
                const { error } = await supabase.from("categories").update({ image_url }).eq("id", collection.id);
                if (error) throw error;
                setCategories(current => current.map(item => item.id === collection.id ? { ...item, image_url } : item));
              }} />
            </div>)}
          </div>
        </section>}

        {!categoryId && apparelProducts.length > 0 && <section className="mt-14 mb-10 overflow-hidden rounded-2xl bg-card text-card-foreground">
          <div className="px-6 pb-5 pt-8 text-center sm:px-10 sm:pt-10">
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-primary">Artefatos · Camisetas</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl">Camisetas Hiraeth</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Peças inspiradas nas histórias, músicas e universos que fazem parte de você.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-7 sm:grid-cols-3 sm:px-8">
            {apparelProducts.slice(0, 6).map((product) => <Link key={product.id} to="/produto/$slug" params={{ slug: product.slug }} className="group text-center">
              <div className="relative aspect-[4/5] overflow-hidden bg-background">
                {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><Shirt size={42} strokeWidth={1.1} /><span className="text-xs">Foto em breve</span></div>}
              </div>
              <p className="mt-3 font-display text-base sm:text-lg">{product.name}</p>
              <p className="mt-1 flex flex-wrap items-baseline justify-center gap-2 text-sm text-foreground">
                {(() => {
                  const shown = visiblePrice({
                    id: product.id, category_id: product.category_id,
                    price: Number(product.price), sale_price: product.sale_price,
                  }, automaticPromotions, promotionCategories);
                  return <>
                    {shown.hasDiscount && <span className="text-muted-foreground line-through">{brl(shown.original)}</span>}
                    <span className={shown.hasDiscount ? "font-semibold text-primary" : ""}>{brl(shown.current)}</span>
                  </>;
                })()}
              </p>
            </Link>)}
          </div>
        </section>}
        {loading ? (
          <p className="mt-16 text-center text-muted-foreground">
            Abrindo o acervo...
          </p>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-display text-2xl italic text-primary">
              {showFavorites ? "Nenhum favorito ainda" : "Nenhum item encontrado"}
            </p>
            <p className="mt-2 text-muted-foreground">
              {showFavorites
                ? "Toque no coração dos produtos na Loja para encontrá-los aqui."
                : products.length === 0
                  ? "O acervo ainda está sendo preparado. Volte em breve."
                  : "Tente outra busca ou categoria."}
            </p>
          </div>
        ) : (
          <CuratedProductGrid
            key={selectedCategory?.id ?? (showFavorites ? "favorites" : "home")}
            scope={selectedCategory?.id ?? "home"}
            products={filtered.filter(p => !apparelProducts.some(apparel => apparel.id === p.id))}
            categories={categories}
            wishlistIds={wishlistIds}
            onWishlist={(id, event) => { void toggleWishlist(id, event); }}
            onSaveProduct={saveProduct}
            automaticPromotions={automaticPromotions}
            promotionCategories={promotionCategories}
            showFavorites={showFavorites}
            searching={Boolean(query.trim())}
          />
        )}
        {!showFavorites && <CustomerReviews />}
        {!showFavorites && <SecretFlamesPromotion />}
        {enteringCategory && <div className="portal-entry-overlay" aria-hidden="true">{enteringCategory.image_url ? <img src={enteringCategory.image_url} alt="" className="portal-entry-image" /> : <div className="portal-entry-placeholder"><span>{enteringCategory.name}</span></div>}</div>}
      </main>

      <SiteFooter />
    </div>
  );
}
