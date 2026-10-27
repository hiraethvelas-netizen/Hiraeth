import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { brl } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type AromaNote = { essence_id: string; quantity_ml: number; essences?: { name: string; top_notes: string[] | null; heart_notes: string[] | null; base_notes: string[] | null } | null };

export const Route = createFileRoute("/produto/$slug")({
  head: () => ({
    meta: [
      { title: "Produto — Hiraeth" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [aromaNotes, setAromaNotes] = useState<AromaNote[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setProduct(data);
      setLoading(false);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && data) {
        setUserId(userData.user.id);
        const { data: w } = await supabase
          .from("wishlist_items")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("product_id", data.id)
          .maybeSingle();
        setInWishlist(!!w);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
          <p className="text-muted-foreground">Carregando...</p>
        </main>
      </div>
    );
  }

  if (!product) throw notFound();

  const price = product.sale_price != null ? Number(product.sale_price) : Number(product.price);
  const outOfStock = product.stock <= 0;

  async function toggleWishlist() {
    if (!userId) {
      toast.info("Entre na sua conta para salvar desejos.");
      return;
    }
    if (inWishlist) {
      await supabase.from("wishlist_items").delete().eq("user_id", userId).eq("product_id", product!.id);
      setInWishlist(false);
      toast.success("Removido dos desejos.");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: userId, product_id: product!.id });
      setInWishlist(true);
      toast.success("Adicionado aos seus desejos.");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
        <nav className="text-sm text-muted-foreground">
          <Link to="/loja" className="hover:text-primary">Loja</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden border bg-muted">
              {product.images[activeImage] ? (
                <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-lg italic text-muted-foreground">
                  Foto em breve
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 overflow-hidden border ${i === activeImage ? "border-primary" : "opacity-60 hover:opacity-100"}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-4xl text-foreground">{product.name}</h1>
            {product.fragrance && <p className="eyebrow mt-2 text-lg">{product.fragrance}</p>}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl text-primary">{brl(price)}</span>
              {product.sale_price != null && (
                <span className="text-lg text-muted-foreground line-through">{brl(Number(product.price))}</span>
              )}
            </div>

            {aromaNotes.length > 0 && <section className="mt-6 border-l-2 border-primary pl-4"><h2 className="font-display text-xl text-foreground">Pirâmide olfativa</h2>{([["Saída", "top_notes"], ["Corpo", "heart_notes"], ["Fundo", "base_notes"]] as const).map(([label, key])=>{const notes=Array.from(new Set(aromaNotes.flatMap(a=>a.essences?.[key] ?? [])));return notes.length ? <div key={label} className="mt-3"><p className="text-xs uppercase tracking-widest text-primary">{label}</p><p className="mt-1 text-sm text-foreground/85">{notes.join(", ")}</p></div> : null;})}</section>}\n\n            {product.description && (
              <p className="mt-6 leading-relaxed text-foreground/85">{product.description}</p>
            )}

            {product.features && product.features.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-6 text-foreground/85 marker:text-primary">
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg">−</button>
                <span className="w-10 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 text-lg">+</button>
              </div>
              <button
                disabled={outOfStock}
                onClick={() => {
                  cart.add(
                    {
                      productId: product.id,
                      slug: product.slug,
                      name: product.name,
                      price,
                      image: product.images[0],
                    },
                    quantity,
                  );
                  toast.success("Adicionado ao carrinho.");
                }}
                className="btn-gold flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                {outOfStock ? "Esgotado" : "Adicionar ao carrinho"}
              </button>
            </div>

            <button onClick={toggleWishlist} className="mt-4 text-sm text-muted-foreground underline hover:text-primary">
              {inWishlist ? "♥ Nos seus desejos" : "♡ Adicionar aos desejos"}
            </button>

            {product.portal_id && (
              <p className="mt-6 border-l-2 border-primary pl-4 text-sm italic text-muted-foreground">
                Esta peça possui um portal NFC. Escaneie a tag da embalagem para abrir o universo.
              </p>
            )}

            <p className="mt-6 text-sm text-muted-foreground">
              {product.stock > 0 && product.stock <= 5
                ? `Últimas ${product.stock} unidades.`
                : outOfStock
                  ? "Indisponível no momento."
                  : "Em estoque."}
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
