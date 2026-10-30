import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteLayout";
import type { Tables } from "@/integrations/supabase/types";

type Portal = Tables<"portals">;
type Fragment = Tables<"portal_fragments">;

export const Route = createFileRoute("/portal/$slug")({
  head: () => ({
    meta: [
      { title: "Portal — Hiraeth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

function spotifyEmbed(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  return m ? `https://open.spotify.com/embed/playlist/${m[1]}?utm_source=generator&theme=0` : null;
}

function PortalPage() {
  const { slug } = Route.useParams();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState(true);
  const [introReveal, setIntroReveal] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("portals")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setPortal(data);
      if (data) {
        const { data: frags } = await supabase
          .from("portal_fragments")
          .select("*")
          .eq("portal_id", data.id)
          .eq("visible", true)
          .order("position");
        setFragments(frags ?? []);
        setIntro(Boolean(data.intro_enabled));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!portal || intro) return;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-portal-reveal]"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [portal, intro]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-xl italic text-muted-foreground">Abrindo o portal...</p>
      </div>
    );
  }

  if (!portal) throw notFound();

  const embed = portal.spotify_playlist_url ? spotifyEmbed(portal.spotify_playlist_url) : null;
  const portalTheme = (portal.theme && typeof portal.theme === "object" ? portal.theme : {}) as Record<string, any>;
  const palette = portalTheme.palette ?? {};
  const carouselItems = Array.isArray(portalTheme.carousel_items) ? portalTheme.carousel_items : [];
  const appUrl = "https://hiraeth-oficial.lovable.app/inicio";



  return (
    <div className="portal-world min-h-screen" style={{
      ["--portal-bg" as string]: palette.background || "#17251d",
      ["--portal-surface" as string]: palette.surface || "#26382d",
      ["--portal-text" as string]: palette.text || "#f5edda",
      ["--portal-accent" as string]: palette.accent || "#c6a65b",
      ["--portal-button-text" as string]: palette.buttonText || "#17251d",
    }}>
      {intro && portal.intro_enabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          {portal.intro_video_url ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={portal.intro_video_url}
              poster={portal.cover_url ?? undefined}
              autoPlay
              muted
              playsInline
              preload="auto"
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (video.duration && video.duration - video.currentTime <= 2.2) {
                  setIntroReveal(true);
                }
              }}
              onEnded={() => setIntroReveal(true)}
              onError={() => setIntroReveal(true)}
              onPlay={() => setIntroReveal(false)}
              aria-label={portal.intro_title ?? portal.name}
            />
          ) : portal.cover_url ? (
            <img src={portal.cover_url} alt="" className="animate-portal absolute inset-0 h-full w-full object-cover" />
          ) : null}
          {portal.intro_video_url ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          ) : (
            <div className="absolute inset-0 bg-overlay/35" />
          )}
          <div
            className={`absolute inset-x-0 bottom-[9%] z-10 flex flex-col items-center px-6 pb-[max(env(safe-area-inset-bottom),1rem)] text-center transition-all duration-[1400ms] ease-out md:bottom-[12%] ${introReveal ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"}`}
            aria-hidden={!introReveal}
          >
            <h1 className="max-w-4xl text-4xl text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] md:text-6xl lg:text-7xl">{portal.intro_title ?? portal.name}</h1>
            {portal.intro_subtitle && <p className="eyebrow mt-4 text-xl text-white drop-shadow-md">{portal.intro_subtitle}</p>}
            <button
              onClick={() => setIntro(false)}
              tabIndex={introReveal ? 0 : -1}
              className="btn-gold mt-6"
            >
              {portal.intro_cta_text || "Atravesse o Portal"}
            </button>
          </div>
        </div>
      )}

      <header data-portal-reveal className="portal-reveal relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        {portal.cover_url && (
          <img src={portal.cover_url} alt={portal.name} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-overlay" />
        <div className="relative px-6 text-center">
          {portal.universe && <p className="eyebrow text-xl">{portal.universe}</p>}
          <h1 className="mt-3 text-5xl md:text-7xl">{portal.name}</h1>
          {portal.intro_subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/85">{portal.intro_subtitle}</p>}
          {portal.store_category_url && (
            <a href={portal.store_category_url} className="btn-gold mt-8 inline-flex">
              Explorar o catálogo deste universo
            </a>
          )}
        </div>
      </header>

      {portal.spotify_visible && (embed || portal.spotify_playlist_url) && (
        <section data-portal-reveal className="portal-reveal mx-auto max-w-2xl px-6 py-16">
          <p className="eyebrow">Trilha do universo</p>
          <h2 className="mt-2 text-3xl">{portal.spotify_title ?? "Playlist"}</h2>
          {portal.spotify_description && (
            <p className="mt-3 text-foreground/85">{portal.spotify_description}</p>
          )}
          {embed ? (
            <iframe
              src={embed}
              title="Playlist do Spotify"
              className="mt-6 w-full border"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <a href={portal.spotify_playlist_url!} target="_blank" rel="noreferrer" className="btn-gold mt-6">
              Ouvir no Spotify
            </a>
          )}
        </section>
      )}

      {fragments.length > 0 && (
        <section data-portal-reveal className="portal-reveal mx-auto max-w-2xl px-6 pb-16">
          <p className="eyebrow">Fragmentos</p>
          <h2 className="mt-2 text-3xl">Cartas deste universo</h2>
          <div className="mt-8 space-y-8">
            {fragments.map((f) => (
              <article key={f.id} className="border bg-card p-6">
                <h3 className="text-2xl text-primary">{f.title}</h3>
                {f.reference && <p className="mt-1 text-sm italic text-muted-foreground">{f.reference}</p>}
                {f.image_url && (
                  <figure className="mt-4">
                    <img src={f.image_url} alt={f.caption ?? f.title} className="w-full border" loading="lazy" />
                    {f.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{f.caption}</figcaption>}
                  </figure>
                )}
                <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">{f.body}</p>
                {f.context && <p className="mt-3 text-sm text-muted-foreground">{f.context}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {carouselItems.length > 0 && (
        <section data-portal-reveal className="portal-reveal portal-carousel-section mx-auto max-w-6xl px-6 py-14">
          <p className="eyebrow">Peças deste universo</p>
          <h2 className="mt-2 text-3xl">Um pequeno acervo para explorar</h2>
          <div className="portal-hanger mt-8 flex snap-x gap-5 overflow-x-auto pb-5" aria-label="Carrossel de itens temáticos">
            {carouselItems.map((item: any, index: number) => (
              <article key={item.id ?? index} className="portal-hanger-item min-w-[190px] max-w-[220px] flex-none snap-start">
                {item.image_url && <img src={item.image_url} alt={item.title || "Item do universo"} loading="lazy" className="aspect-[4/5] w-full object-cover" />}
                <h3 className="mt-3 font-display text-xl">{item.title}</h3>
                {item.description && <p className="mt-1 text-sm opacity-80">{item.description}</p>}
                {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">Explorar</a>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section data-portal-reveal className="portal-reveal portal-app-invitation mx-auto mb-14 max-w-3xl px-6 py-12 text-center">
        <p className="eyebrow">Há outros universos esperando</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">Gostou de explorar este universo?</h2>
        <p className="mx-auto mt-3 max-w-xl text-base opacity-85">Há muitos outros esperando por você no aplicativo Hiraeth.</p>
        <a href={appUrl} className="portal-app-button mt-7 inline-flex items-center justify-center rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-[.12em] transition-transform hover:-translate-y-1">
          Conhecer o app Hiraeth
        </a>
      </section>

      <p className="pb-8 text-center text-sm italic text-muted-foreground">
        Hiraeth — Onde a Chama Acesa te Espera
      </p>
      <SiteFooter />
    </div>
  );
}
