import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string; slug: string; image_url: string | null; parent_id: string | null; is_temporary?: boolean; starts_at?: string | null; ends_at?: string | null };

const FEATURED = ["harry-potter", "universo-sarah-j-maas", "friends", "the-vampire-diaries", "crepusculo", "taylor-swift", "gilmore-girls"];

export function CollectionPortals() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entering, setEntering] = useState<Category | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    void supabase.from("categories").select("id,name,slug,image_url,parent_id,is_temporary,starts_at,ends_at").eq("visible", true).not("parent_id", "is", null).order("position")
      .then(({ data }) => {
        if (!alive) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const active = ((data ?? []) as Category[]).filter((c) => !c.is_temporary || Boolean(c.starts_at && c.ends_at && c.starts_at <= today && c.ends_at >= today));
        setCategories(FEATURED.map((slug) => active.find((c) => c.slug === slug)).filter((c): c is Category => Boolean(c)));
      });
    return () => { alive = false; };
  }, []);

  function enter(category: Category) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void navigate({ to: "/loja", search: { categoria: category.slug } as never });
      return;
    }
    setEntering(category);
    window.setTimeout(() => {
      void navigate({ to: "/loja", search: { categoria: category.slug } as never });
      setEntering(null);
    }, 620);
  }

  if (!categories.length) return null;

  return <>
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <p className="eyebrow text-center">Portais permanentes</p>
      <h2 className="mt-2 text-center text-3xl text-foreground md:text-4xl">Explore o Acervo Hiraeth</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Sete universos para atravessar e descobrir.</p>
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => <button key={category.id} type="button" onClick={() => enter(category)} className="group flex flex-col items-center gap-3 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <span className="relative block aspect-square w-full max-w-44 overflow-hidden rounded-full border border-primary/40 bg-card p-1 shadow-[var(--glow)] transition-transform duration-500 group-hover:scale-105 group-active:scale-95">
            {category.image_url ? <img src={category.image_url} alt="" className="h-full w-full rounded-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-card via-muted to-card px-3 font-display text-xl text-primary">{category.name}</span>}
            <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_0_30px_rgba(198,166,91,0.65)] transition-opacity duration-500 group-hover:opacity-100" />
          </span>
          <span className="font-display text-xl text-foreground transition-colors group-hover:text-primary">{category.name}</span>
          {category.is_temporary && <span className="border border-amber-600/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-amber-700">Temporária</span>}
        </button>)}
      </div>
    </section>
    {entering && <div className="portal-entry-overlay" aria-hidden="true">
      {entering.image_url ? <img src={entering.image_url} alt="" className="portal-entry-image" /> : <div className="portal-entry-placeholder"><span>{entering.name}</span></div>}
      <div className="portal-entry-glow" />
    </div>}
  </>;
}
