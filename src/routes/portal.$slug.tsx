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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-xl italic text-muted-foreground">Abrindo o portal...</p>
      </div>
    );
  }

  if (!portal) throw notFound();

  const embed = portal.spotify_playlist_url ? spotifyEmbed(portal.spotify_playlist_url) : null;

  return (
    <div className="min-h-screen">
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

      <header className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
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
        <section className="mx-auto max-w-2xl px-6 py-16">
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
        <section className="mx-auto max-w-2xl px-6 pb-16">
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

      <p className="pb-8 text-center text-sm italic text-muted-foreground">
        Hiraeth — Onde a Chama Acesa te Espera
      </p>
      <SiteFooter />
    </div>
  );
}
