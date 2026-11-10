import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight, BookOpenText, Headphones, LibraryBig, Smartphone } from "lucide-react";
import { PortalInspirationCard } from "@/components/PortalInspirationChapters";
import { PortalFestiveAccents } from "@/components/PortalFestiveAccents";
import { PortalIntro } from "@/components/PortalIntro";
import { PortalChristmasDecor } from "@/components/PortalChristmasDecor";
import { carouselFromTheme, isMagicWorld, magicWorldTitle, portalCatalogDestination, spotifyPlaylistUrl } from "@/lib/portal-experience";
import { useEffect, useRef, useState } from "react";
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

function PortalPage() {
  const { slug } = Route.useParams();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fragmentsLoading, setFragmentsLoading] = useState(true);
  const [fragmentsError, setFragmentsError] = useState(false);
  const [fragmentsReloadKey, setFragmentsReloadKey] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(false);
      setIntro(true);
      setPortal(null);
      setFragments([]);
      setFragmentsLoading(true);
      try {
        const { data, error } = await supabase
          .from("portals")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();
        if (!active) return;
        if (error) throw error;
        setPortal(data);
        setIntro(isMagicWorld(slug) || Boolean(data?.intro_enabled));
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {active = false;};
  }, [slug, reloadKey]);

  useEffect(() => {
    if (!portal) return;
    const portalId = portal.id;
    let active = true;
    async function loadFragments() {
      setFragmentsLoading(true);
      setFragmentsError(false);
      setFragments([]);
      try {
        const { data, error } = await supabase
          .from("portal_fragments")
          .select("*")
          .eq("portal_id", portalId)
          .eq("visible", true)
          .order("position");
        if (!active) return;
        if (error) throw error;
        setFragments(data ?? []);
      } catch {
        if (active) setFragmentsError(true);
      } finally {
        if (active) setFragmentsLoading(false);
      }
    }
    void loadFragments();
    return () => {active = false;};
  }, [portal, fragmentsReloadKey]);

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

  if (loadError) return <div className="flex min-h-screen flex-col items-center justify-center bg-[#10231b] px-6 text-center text-[#f7efda]">
    <p role="alert">Não foi possível carregar o portal. Verifique sua conexão e tente novamente.</p>
    <button type="button" onClick={() => setReloadKey(value => value + 1)}
      className="mt-5 rounded-full border border-[#d3b575] px-5 py-3 text-[#f7efda] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
      Tentar carregar o portal novamente
    </button>
  </div>;
  if (!portal) throw notFound();

  const spotifyUrl = spotifyPlaylistUrl(portal.spotify_playlist_url);
  const embed = spotifyUrl ? spotifyUrl.replace("/playlist/","/embed/playlist/") : null;
  const portalTheme = (portal.theme && typeof portal.theme === "object" && !Array.isArray(portal.theme) ? portal.theme : {}) as Record<string, unknown>;
  const rawPalette = portalTheme["palette"];
  const palette = (rawPalette && typeof rawPalette==="object" && !Array.isArray(rawPalette)
    ? rawPalette : {}) as Record<string,string>;
  const carouselItems = carouselFromTheme(portalTheme).filter(item=>Boolean(item.image_url));
  const appUrl = "https://hiraeth-oficial.lovable.app/inicio";
  const displayTitle = magicWorldTitle(slug,portal.name);
  const catalogUrl = portalCatalogDestination(slug,portal.store_category_url);
  const magicWorld = isMagicWorld(slug);

  function scrollGallery(direction: -1 | 1) {
    const element = galleryRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.min(element.clientWidth * .88, 720), behavior: "smooth" });
  }



  return (
    <div className={`portal-world min-h-screen${magicWorld ? " portal-world--christmas" : ""}`} style={{
      ["--portal-bg" as string]: magicWorld ? "#111923" : palette["background"] || "#17251d",
      ["--portal-surface" as string]: magicWorld ? "#202d3d" : palette["surface"] || "#26382d",
      ["--portal-text" as string]: magicWorld ? "#f7efda" : palette["text"] || "#f5edda",
      ["--portal-accent" as string]: magicWorld ? "#d3b575" : palette["accent"] || "#c6a65b",
      ["--portal-button-text" as string]: palette["buttonText"] || "#17251d",
    }}>
      {intro && (magicWorld || portal.intro_enabled) && <PortalIntro
        key={portal.id}
        title={magicWorld ? "O Mundo da Magia" : portal.intro_title || displayTitle}
        subtitle={magicWorld ? null : portal.intro_subtitle}
        videoUrl={portal.intro_video_url}
        posterUrl={magicWorld ? null : portal.cover_url}
        ctaText="Atravesse o Portal"
        christmas={magicWorld}
        onEnter={()=>setIntro(false)}
      />}

      <div inert={intro} aria-hidden={intro}>
      <header data-portal-reveal className="portal-reveal portal-magic-hero relative flex min-h-[52vh] items-center justify-center overflow-hidden px-5 py-24">
        {!magicWorld && portal.cover_url && <img src={portal.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {!magicWorld && <div className="absolute inset-0 bg-gradient-to-b from-[#10251d]/65 via-[#10251d]/80 to-[var(--portal-bg)]" />}
        {magicWorld && <PortalChristmasDecor scene="hero" />}
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[.37em] text-[var(--portal-accent)]">
            {magicWorld?"Entre castelos, feitiços e histórias":portal.universe||"Universo da coleção"}
          </p>
          {magicWorld ? <h1 className="portal-magic-welcome mt-6 font-display text-[var(--portal-text)]">
            <span className="portal-magic-welcome-lead">Seja bem-vindo ao</span>
            <span className="portal-magic-welcome-title">Mundo da Magia</span>
          </h1> : <h1 className="mt-6 font-display text-5xl leading-[1.04] text-[var(--portal-text)] md:text-7xl">
            {displayTitle}
          </h1>}
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--portal-text)]/85">
            {portal.intro_subtitle || (magicWorld ? "Sob velas flutuantes e um céu de encantamentos, cada chama abre as portas de um universo mágico." : "Cada chama guarda uma história. Escolha o caminho que deseja explorar.")}
          </p>
          <div className="mx-auto mt-8 h-px w-28 bg-[var(--portal-accent)]/70" />
        </div>
      </header>

      <main>
        <section data-portal-reveal className="portal-reveal portal-christmas-hall relative mx-auto max-w-5xl overflow-hidden px-5 pb-20 pt-10 md:px-8">
          {magicWorld && <PortalChristmasDecor scene="actions" />}
          <div className="relative z-10 mb-10 text-center">
            <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Escolha seu caminho</p>
            <h2 className="portal-script-title mt-3">Portas para este universo</h2>
          </div>
          <div className="portal-action-grid portal-action-grid--ornate relative z-10 grid gap-4 sm:grid-cols-2">
            {spotifyUrl && portal.spotify_visible ? <a className="portal-action-card" href={spotifyUrl}
                target="_blank" rel="noopener noreferrer" aria-label="Ouvir playlist da coleção no Spotify">
                <Headphones aria-hidden="true" size={26}/><span><strong>Playlist no Spotify</strong>
                <small>Uma trilha sonora para acompanhar a sua chama</small></span><ArrowUpRight aria-hidden="true" size={19}/>
              </a> : <div className="portal-action-card portal-action-card--pending" aria-label="Playlist no Spotify em preparação">
                <Headphones aria-hidden="true" size={26}/><span><strong>Playlist no Spotify</strong>
                <small>Em preparação — o link será adicionado em breve</small></span>
              </div>}
            <a className="portal-action-card" href={catalogUrl}>
              <LibraryBig aria-hidden="true" size={26}/><span><strong>Conheça o acervo</strong>
              <small>Explore as velas desta coleção</small></span><ArrowUpRight aria-hidden="true" size={19}/>
            </a>
            <a className="portal-action-card" href={magicWorld ? `/portal/${encodeURIComponent(slug)}/inspiracoes` : "#portal-inspiracoes"}>
              <BookOpenText aria-hidden="true" size={26}/><span><strong>Conheça as inspirações</strong>
              <small>Histórias e referências por trás de cada criação</small></span><ArrowUpRight aria-hidden="true" size={19}/>
            </a>
            <a className="portal-action-card" href={appUrl} target="_blank" rel="noopener noreferrer">
              <Smartphone aria-hidden="true" size={26}/><span><strong>Baixe o aplicativo</strong>
              <small>Abra o Portal Digital Hiraeth no navegador</small></span><ArrowUpRight aria-hidden="true" size={19}/>
            </a>
          </div>
          <p className="relative z-10 mt-6 text-center text-xs text-[var(--portal-text)]/65">
            Para instalar no celular, abra o aplicativo no navegador e escolha “Adicionar à tela inicial”, quando disponível.
          </p>
        </section>

      {portal.spotify_visible && embed && <section data-portal-reveal
        className="portal-reveal mx-auto max-w-2xl px-5 pb-16">
        <p className="text-center text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Trilha sonora</p>
        <h2 className="portal-script-title mt-3 text-center">{portal.spotify_title||"Músicas para atravessar o portal"}</h2>
        {portal.spotify_description && <p className="mx-auto mt-3 max-w-lg text-center text-sm opacity-80">{portal.spotify_description}</p>}
        <iframe src={embed} title="Playlist da coleção no Spotify" className="mt-6 w-full rounded-xl border border-[var(--portal-accent)]/30"
          height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      </section>}

      {magicWorld ? <section id="portal-natal" aria-labelledby="portal-natal-title" className="portal-festive-section relative isolate mx-auto max-w-5xl overflow-hidden px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
        <PortalFestiveAccents variant="natal" />
        <div className="mb-9 text-center">
          <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Duas velas, duas lembranças</p>
          <h2 id="portal-natal-title" className="portal-script-title mt-3">O Natal no Mundo da Magia</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 opacity-85 sm:text-base">
            O brilho das árvores, o conforto da amizade e os presentes que carregam carinho.
            Conheça os aromas que nasceram dessas lembranças.
          </p>
        </div>
        {fragmentsLoading ? <p role="status" className="py-6 text-center">Carregando a coleção de Natal...</p>
          : fragmentsError ? <div className="portal-inspiration-card mx-auto max-w-xl p-6 text-center">
            <p role="alert">Não foi possível carregar a coleção de Natal. Tente novamente.</p>
            <button type="button" onClick={() => setFragmentsReloadKey(value => value + 1)}
              className="mt-4 rounded-full border border-[var(--portal-accent)] px-5 py-3 focus-visible:outline focus-visible:outline-2">
              Tentar carregar novamente
            </button>
          </div> : fragments.some(fragment => fragment.position === 7 || fragment.position === 8 || fragment.position === 9) ? <>
            <div className="mx-auto mb-5 max-w-3xl">
              {fragments.filter(fragment => fragment.position === 7).map(fragment =>
                <PortalInspirationCard key={fragment.id} fragment={fragment} featured />)}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {fragments.filter(fragment => fragment.position === 8 || fragment.position === 9).map(fragment =>
                <PortalInspirationCard key={fragment.id} fragment={fragment} />)}
            </div>
          </> : <p className="mx-auto max-w-2xl py-6 text-center text-sm opacity-80">
            Os detalhes das velas natalinas serão revelados aqui.
          </p>}
        <div className="mt-10 text-center">
          <a href={catalogUrl} className="portal-collection-shop-link mx-auto inline-flex items-center justify-center gap-2">
            Explorar a coleção de Natal <ArrowUpRight size={17} aria-hidden="true"/>
          </a>
        </div>
      </section> : <section id="portal-inspiracoes" className="mx-auto max-w-4xl scroll-mt-10 px-5 py-12 md:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Nos bastidores de cada chama</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">Conheça as inspirações</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-80">Pequenos detalhes, cenas e histórias que deram vida aos aromas deste universo.</p>
        </div>
        {fragmentsLoading ? <p role="status" className="py-8 text-center">Carregando as inspirações...</p>
          : fragmentsError ? <div className="portal-inspiration-card px-7 py-11 text-center">
            <p role="alert">Não foi possível carregar as inspirações. Verifique sua conexão e tente novamente.</p>
            <button type="button" onClick={() => setFragmentsReloadKey(value => value + 1)}
              className="mt-5 rounded-full border border-[var(--portal-accent)] px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
              Tentar carregar as inspirações novamente
            </button>
          </div> : fragments.length > 0 ? <div className="grid gap-5 sm:grid-cols-2">
            {fragments.map(fragment => <PortalInspirationCard key={fragment.id} fragment={fragment} />)}
          </div> : <div className="portal-inspiration-card px-7 py-11 text-center">
            <BookOpenText size={30} aria-hidden="true" className="mx-auto text-[var(--portal-accent)]"/>
            <p className="mt-4 font-display text-xl">As histórias por trás das velas serão reveladas aqui.</p>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-75">Novos relatos e inspirações serão adicionados a esta coleção.</p>
          </div>}
      </section>}

      {(!magicWorld || carouselItems.length > 0) && <section className="portal-carousel-section mt-6 py-12 sm:py-16">
        {magicWorld && <PortalChristmasDecor scene="gallery" />}
        <div className={magicWorld ? "portal-collection-frame mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14" : "mx-auto max-w-6xl px-6"}>
          <div className="portal-collection-heading text-center">
            <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">{magicWorld ? "Relíquias deste universo" : "Explore a coleção"}</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl">
              {magicWorld ? "Fotografias da coleção de Natal" : "Um vislumbre da coleção"}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed opacity-80">
              Histórias, memórias e aromas que merecem ser descobertos.
            </p>
            {magicWorld && <span className="portal-collection-divider" aria-hidden="true">✦</span>}
          </div>
          {carouselItems.length>0 ? <div className="portal-gallery-shell mt-9">
            <div ref={galleryRef} className="portal-gallery-viewport flex gap-4 overflow-x-auto pb-5"
              role="region" aria-label="Fotos da coleção">
              {carouselItems.map((item,index)=><article key={item.id+"-"+index}
                className="portal-gallery-photo relative w-56 shrink-0 sm:w-64">
                {item.url ? <a href={item.url} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--portal-accent)]">
                  <img src={item.image_url} alt={item.title} className="aspect-[4/5] w-full rounded-md object-cover" loading="lazy"/>
                </a> : <img src={item.image_url} alt={item.title} className="aspect-[4/5] w-full rounded-md object-cover" loading="lazy" />}
                <h3 className="mt-4 text-center font-display text-xl">{item.title}</h3>
                {item.description && <p className="mt-1 text-center text-xs leading-relaxed opacity-75">{item.description}</p>}
              </article>)}
            </div>
            {carouselItems.length>1 && <div className="portal-gallery-controls mt-5 flex justify-center gap-3">
              <button type="button" aria-label="Ver fotos anteriores da coleção" onClick={()=>scrollGallery(-1)}>←</button>
              <button type="button" aria-label="Ver próximas fotos da coleção" onClick={()=>scrollGallery(1)}>→</button>
            </div>}
          </div> : <div className="portal-gallery-empty mx-auto mt-10 flex max-w-xl flex-col items-center justify-center px-8 py-12 text-center">
            <span className="portal-gallery-empty-icon" aria-hidden="true">✦</span>
            <p className="mt-3 font-display text-2xl">As histórias ganham forma em breve.</p>
            <p className="mt-3 text-sm leading-relaxed opacity-80">
              As fotografias oficiais da coleção aparecerão aqui assim que forem adicionadas em “Meus Portais NFC”.
            </p>
          </div>}
          {magicWorld && <a href={catalogUrl} className="portal-collection-shop-link mx-auto mt-9 inline-flex items-center justify-center gap-3">
            Explorar o acervo <ArrowUpRight size={17} aria-hidden="true"/>
          </a>}
        </div>
      </section>}
      </main>

      <p className="pb-8 text-center text-sm italic text-[var(--portal-text)]/80">
        Hiraeth — Onde a Chama Acesa te Espera
      </p>
      <SiteFooter />
      </div>
    </div>
  );
}
