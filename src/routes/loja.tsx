import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";
import { StoreBanners } from "@/components/StoreBanners";
import { AcervoNavigation } from "@/components/AcervoNavigation";
import { CustomerReviews } from "@/components/CustomerReviews";
import { SecretFlamesPromotion } from "@/components/SecretFlamesPromotion";
import { Heart, Shirt } from "lucide-react";
import { toast } from "sonner";


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


function filteredProductsForApparel(products: Product[], categories: Category[]) {
  return products.filter((product) => {
    const category = categories.find((item) => item.id === product.category_id);
    return /camiseta|t-shirt|roupa|vestuário/i.test(`${product.name} ${category?.name ?? ""}`);
  });
}

function Loja() {
  const [pageSettings, savePageSettings] = useSiteContent("store-page-settings", { eyebrow: "O Acervo Hiraeth", title: "O Acervo Hiraeth", intro: "Encontre o universo que mora em você.", bannerImage: "", showBanner: false });
  const [products, setProducts] = useState<Product[]>([]);
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
  const featuredCollections = featuredCollectionSlugs.map((slug) => categories.find((category) => category.slug === slug)).filter((category): category is Category => Boolean(category));
  const apparelProducts = !categoryId ? filteredProductsForApparel(products, categories) : [];

  const filtered = useMemo(() => {
    const activeCategoryIds = new Set(categories.map((category) => category.id));
    return products.filter((p) => {
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
  }, [products, query, categoryId, categories]);

  useEffect(() => {
    if (loading || typeof IntersectionObserver === "undefined") return;
    const cards = document.querySelectorAll<HTMLElement>(".hiraeth-product-card[data-product-badge]");
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
      <AcervoNavigation />
      {!selectedCategory && <StoreBanners />}

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
        {/* Catálogo da loja */}
        {!selectedCategory && <div className="mb-5 space-y-3">
          <InlineEditor label="apresentação da loja" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "intro", label: "Texto de apresentação", type: "textarea" }, { name: "bannerImage", label: "Banner opcional", type: "image" }, { name: "showBanner", label: "Exibir banner", type: "checkbox" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
        </div>}
        {!selectedCategory && pageSettings.showBanner && pageSettings.bannerImage && <img src={pageSettings.bannerImage} alt="Banner da loja Hiraeth" className="mb-8 max-h-[28rem] w-full object-cover" />}

        {selectedCategory && <section className="hiraeth-category-hero hiraeth-reveal relative mt-7 mb-10 overflow-hidden rounded-xl border border-primary/40">
          {selectedCategory.image_url ? <img src={selectedCategory.image_url} alt={selectedCategory.name} className="h-64 w-full object-cover sm:h-80 md:h-[26rem]" /> : <div className="h-48 w-full bg-[radial-gradient(ellipse_at_center,_var(--color-secondary),_var(--color-background)_70%)] sm:h-64 md:h-80" aria-hidden="true" />}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#07110b]/95 via-[#07110b]/25 to-transparent p-6 sm:p-10">
            <div><p className="eyebrow !text-[#e2c477]">Entre neste universo</p><h2 className="hiraeth-editorial-title !mx-0 mt-2 !text-left text-4xl text-white sm:text-5xl md:text-6xl">{selectedCategory.name}</h2>
              {selectedCategory.is_temporary && <span className="mt-2 inline-flex border border-amber-200/80 bg-black/25 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-100">Coleção temporária{selectedCategory.ends_at ? ` · até ${new Date(selectedCategory.ends_at + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}</span>}
            </div>
          </div>
          <InlineEditor label={"banner da coleção " + selectedCategory.name} fields={[{ name: "name", label: "Nome da coleção", type: "text" }, { name: "image_url", label: "Foto do banner da coleção", type: "image", help: "Essa imagem também será usada na bolinha da subcategoria. JPG, PNG ou WebP." }]} values={{ name: selectedCategory.name, image_url: selectedCategory.image_url ?? "" }} onSave={async values => {
            const payload = { name: String(values["name"] ?? selectedCategory.name).trim(), image_url: String(values["image_url"] ?? selectedCategory.image_url ?? "").trim() || null };
            const { error } = await supabase.from("categories").update(payload).eq("id", selectedCategory.id);
            if (error) throw error;
            setCategories(current => current.map(item => item.id === selectedCategory.id ? { ...item, ...payload } as Category : item));
          }} className="mt-3" />
        </section>}

        {!categoryId && featuredCollections.length > 0 && <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="eyebrow">{pageSettings.eyebrow}</p><h2 className="hiraeth-editorial-title hiraeth-acervo-heading !mx-0 mt-2 !text-left !text-4xl md:!text-6xl">{pageSettings.title}</h2>{pageSettings.intro && <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{pageSettings.intro}</p>}</div><span className="shrink-0 text-xs text-muted-foreground">7 universos</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {featuredCollections.map((collection) => <div key={collection.id} className="flex min-w-0 flex-col items-center gap-2">
              <button type="button" onClick={() => { const enter = () => { setCategoryId(collection.id); const url = new URL(window.location.href); url.searchParams.set("categoria", collection.slug); window.history.replaceState({}, "", url.toString()); window.scrollTo({ top: 0, behavior: "smooth" }); }; if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) enter(); else { setEnteringCategory(collection); window.setTimeout(() => { enter(); setEnteringCategory(null); }, 620); } }} className="hiraeth-collection-card group relative aspect-square w-full overflow-hidden rounded-full text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className="absolute inset-0 bg-muted">{collection.image_url ? <img src={collection.image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-card to-muted p-3 text-center font-display text-xl text-primary">{collection.name}</div>}</div>
                <div className="absolute inset-0 flex items-end justify-center rounded-full bg-gradient-to-t from-black/80 via-black/5 to-transparent p-4 pb-6"><span className="hiraeth-collection-label font-display text-lg text-white sm:text-xl">{collection.name}</span>{collection.is_temporary && <span className="ml-auto border border-amber-100/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-50">Temporária</span>}</div>
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

        {!categoryId && apparelProducts.length > 0 && <section className="mt-14 mb-10 overflow-hidden rounded-2xl bg-[#e9e4dc] text-[#292720]">
          <div className="px-6 pb-5 pt-8 text-center sm:px-10 sm:pt-10">
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-[#82796d]">Vista seu universo</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl">Camisetas Hiraeth</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#665f56] sm:text-base">Peças inspiradas nas histórias, músicas e universos que fazem parte de você.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-7 sm:grid-cols-3 sm:px-8">
            {apparelProducts.slice(0, 6).map((product) => <Link key={product.id} to="/produto/$slug" params={{ slug: product.slug }} className="group text-center">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#f4f0ea]">
                {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-[#8c8276]"><Shirt size={42} strokeWidth={1.1} /><span className="text-xs">Foto em breve</span></div>}
              </div>
              <p className="mt-3 font-display text-base sm:text-lg">{product.name}</p>
              <p className="mt-1 text-sm text-[#746b60]">{brl(Number(product.sale_price ?? product.price))}</p>
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
            {filtered.filter((p) => !apparelProducts.some((apparel) => apparel.id === p.id)).map((p) => (
              <Link
                key={p.id}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="hiraeth-product-card group block border-0 bg-transparent text-center shadow-none transition-transform duration-300 hover:-translate-y-1" data-product-badge={(p as any).product_badge ?? undefined}
              >
                <div className="hiraeth-product-visual relative aspect-square overflow-hidden bg-transparent">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="hiraeth-product-image h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-lg italic text-muted-foreground">Foto em breve</div>
                  )}
                  <button type="button" onClick={(event) => void toggleWishlist(p.id, event)} aria-label={wishlistIds.has(p.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={wishlistIds.has(p.id)} className="absolute right-3 top-3 z-10 rounded-full bg-[#f5efe5]/90 p-2.5 text-[#68764f] shadow-sm transition hover:scale-105">
                    <Heart size={19} strokeWidth={1.8} fill={wishlistIds.has(p.id) ? "currentColor" : "none"} />
                  </button>
                  {(p as any).product_badge && <span className={`hiraeth-product-badge absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[.16em] shadow-sm ${(p as any).product_badge === "limited" ? "bg-[#8b6b45] text-[#fff8ed]" : (p as any).product_badge === "bestseller" ? "bg-[#66513f] text-[#fff8ed]" : "bg-[#65744d] text-white"}`}>{(p as any).product_badge === "limited" ? "Edição limitada" : (p as any).product_badge === "bestseller" ? "Mais vendido" : "Novidade"}</span>}
                </div>

                <div className="px-2 pb-3 pt-3">
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
                  <h2 className="font-display text-lg font-medium tracking-wide text-foreground sm:text-xl">{p.name}</h2>

                  <div className="mt-2 flex items-baseline justify-center gap-2">
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

                </div>
              </Link>
            ))}
          </div>
        )}
        <CustomerReviews />
        <SecretFlamesPromotion />
        {enteringCategory && <div className="portal-entry-overlay" aria-hidden="true">{enteringCategory.image_url ? <img src={enteringCategory.image_url} alt="" className="portal-entry-image" /> : <div className="portal-entry-placeholder"><span>{enteringCategory.name}</span></div>}</div>}
      </main>

      <SiteFooter />
    </div>
  );
}