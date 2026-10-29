import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit } from "@/lib/admin-edit";
import phoenix from "@/assets/fenix.png";

type Banner = { id: string; title: string | null; image_url: string; href: string; position: number; active: boolean };

export function StoreBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { isAdmin, editMode } = useAdminEdit();
  useEffect(() => {
    let alive = true;
    void (supabase as any).from("site_banners").select("*").eq("active", true).order("position").limit(3)
      .then(({ data }: { data: Banner[] | null }) => { if (alive) setBanners(data ?? []); });
    return () => { alive = false; };
  }, []);

  async function save(banner: Banner, values: Record<string, unknown>) {
    const payload = { title: String(values.title ?? "").trim() || null, image_url: String(values.image_url ?? banner.image_url), href: String(values.href ?? banner.href) };
    const { error } = await (supabase as any).from("site_banners").update(payload).eq("id", banner.id);
    if (error) throw error;
    setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, ...payload } : item));
  }

  const placeholders: Banner[] = [
    { id: "placeholder-1", title: "Novidades do Acervo", image_url: "", href: "/loja", position: 1, active: true },
    { id: "placeholder-2", title: "Novos universos a descobrir", image_url: "", href: "/loja", position: 2, active: true },
    { id: "placeholder-3", title: "Rituais para sua coleção", image_url: "", href: "/loja", position: 3, active: true },
  ];
  const visibleBanners: Banner[] = [...banners.slice(0, 3), ...placeholders.slice(banners.length)].slice(0, 3);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || visibleBanners.length < 2) return;
    let index = 0;
    const interval = window.setInterval(() => {
      const cards = container.querySelectorAll<HTMLElement>("[data-store-banner]");
      if (!cards.length) return;
      index = (index + 1) % cards.length;
      container.scrollTo({ left: cards[index].offsetLeft - container.offsetLeft, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [visibleBanners.length]);
  return <section className="mx-auto max-w-6xl px-5 py-6 md:px-8" aria-label="Novidades da loja">
    <div className="hiraeth-store-heading relative mb-6 flex min-h-28 items-center justify-center overflow-hidden rounded-xl px-5 py-5 sm:min-h-36 md:mb-8">
      <div className="relative z-10 text-center">
        <p className="eyebrow">Um universo de histórias espera por você</p>
        <h2 className="hiraeth-editorial-title hiraeth-acervo-heading mt-2 !text-4xl sm:!text-5xl md:!text-6xl">Conheça <em>o Acervo Hiraeth</em></h2>
        <div className="hiraeth-ornament" aria-hidden="true"><span>✧</span></div>
      </div>
      <img src={phoenix} alt="" aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 z-0 h-32 w-32 -translate-y-1/2 object-contain opacity-80 sm:h-44 sm:w-44 md:h-52 md:w-52" />
    </div>
    <div ref={carouselRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4" aria-roledescription="carrossel de banners">
      {visibleBanners.map((banner) => <article data-store-banner key={banner.id} className="w-[88%] min-w-[88%] snap-start sm:w-[60%] sm:min-w-[60%] md:w-[calc(33.333%-11px)] md:min-w-[calc(33.333%-11px)]">
        <Link to={banner.href as never} className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-primary/20 bg-card">
          {banner.image_url ? <img src={banner.image_url} alt={banner.title ?? "Novidade Hiraeth"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" /> : <div className="flex h-full items-end bg-[radial-gradient(ellipse_at_top,_var(--color-secondary),_var(--color-background)_75%)] p-5 font-display text-2xl text-primary sm:text-3xl">{banner.title}</div>}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          {banner.title && <span className="absolute inset-x-4 bottom-4 font-display text-2xl text-white">{banner.title}</span>}
        </Link>
        {isAdmin && editMode && !banner.id.startsWith("placeholder-") && <InlineEditor label={`banner de novidade: ${banner.title ?? "sem título"}`} className="mt-2" fields={[{ name: "title", label: "Nome/título", type: "text" }, { name: "image_url", label: "Imagem do banner", type: "image" }, { name: "href", label: "Destino do clique", type: "text" }]} values={{ title: banner.title ?? "", image_url: banner.image_url, href: banner.href }} onSave={(values) => save(banner, values)} />}
      </article>)}
    </div>
    {isAdmin && editMode && <p className="mt-2 text-xs text-muted-foreground">Cadastre imagens em Administração → Banners para substituir estes espaços temporários por novidades reais.</p>}
  </section>;
}
