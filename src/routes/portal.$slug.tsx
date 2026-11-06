import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight, BookOpenText, Headphones, LibraryBig, Smartphone } from "lucide-react";
import { PortalIntro } from "@/components/PortalIntro";
import { PortalChristmasDecor } from "@/components/PortalChristmasDecor";
import { carouselFromTheme, isMagicWorld, magicWorldTitle, portalCatalogDestination, spotifyPlaylistUrl } from "@/lib/portal-experience";
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

function PortalPage() {
  const { slug } = Route.useParams();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(false);
      setIntro(true);
      const { data, error } = await supabase
        .from("portals")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!active) return;
      if (error) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      setPortal(data);
      setIntro(isMagicWorld(slug) || Boolean(data?.intro_enabled));
      if (data) {
        const { data: frags } = await supabase
          .from("portal_fragments")
          .select("*")
          .eq("portal_id", data.id)
          .eq("visible", true)
          .order("position");
        if (!active) return;
        setFragments(frags ?? []);
      } else setFragments([]);
      setLoading(false);
    }
    void load();
    return () => {active = false;};
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

  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-[#10231b] px-6 text-center text-[#f7efda]">
    Não foi possível carregar o portal. Verifique sua conexão e tente novamente.
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



  return (
    <div className={`portal-world min-h-screen${magicWorld ? " portal-world--christmas" : ""}`} style={{
      ["--portal-bg" as string]: magicWorld ? "#101e19" : palette["background"] || "#17251d",
      ["--portal-surface" as string]: magicWorld ? "#26362b" : palette["surface"] || "#26382d",
      ["--portal-text" as string]: magicWorld ? "#f7efda" : palette["text"] || "#f5edda",
      ["--portal-accent" as string]: magicWorld ? "#d3b575" : palette["accent"] || "#c6a65b",
      ["--portal-button-text" as string]: palette["buttonText"] || "#17251d",
    }}>
      {intro && (magicWorld || portal.intro_enabled) && <PortalIntro
        key={portal.id}
        title={portal.intro_title || displayTitle}
        subtitle={portal.intro_subtitle}
        videoUrl={portal.intro_video_url}
        posterUrl={portal.cover_url}
        ctaText="Atravesse o Portal"
        christmas={magicWorld}
        onEnter={()=>setIntro(false)}
      />}

      <div inert={intro} aria-hidden={intro}>
      <header data-portal-reveal className="portal-reveal portal-magic-hero relative flex min-h-[52vh] items-center justify-center overflow-hidden px-5 py-24">
        {portal.cover_url && <img src={portal.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[#10251d]/65 via-[#10251d]/80 to-[var(--portal-bg)]" />
        {magicWorld && <PortalChristmasDecor scene="hero" />}
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[.37em] text-[var(--portal-accent)]">
            {magicWorld?"Uma temporada de Natal e encantamentos":portal.universe||"Universo da coleção"}
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.04] text-[var(--portal-text)] md:text-7xl">
            {displayTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--portal-text)]/85">
            {portal.intro_subtitle || (magicWorld ? "Entre pinheiros, luzes douradas e histórias encantadas, o Natal encontra um novo lar." : "Cada chama guarda uma história. Escolha o caminho que deseja explorar.")}
          </p>
          <div className="mx-auto mt-8 h-px w-28 bg-[var(--portal-accent)]/70" />
        </div>
      </header>

      <main>
        <section data-portal-reveal className="portal-reveal portal-christmas-hall relative mx-auto max-w-5xl overflow-hidden px-5 pb-20 pt-10 md:px-8">
          {magicWorld && <PortalChristmasDecor scene="actions" />}
          <div className="relative z-10 mb-10 text-center">
            <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Escolha seu caminho</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">Portas para este universo</h2>
          </div>
          <div className="portal-action-grid relative z-10 grid gap-4 sm:grid-cols-2">
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
            <a className="portal-action-card" href="#portal-inspiracoes">
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
        <h2 className="mt-3 text-center font-display text-3xl">{portal.spotify_title||"Músicas para atravessar o portal"}</h2>
        {portal.spotify_description && <p className="mx-auto mt-3 max-w-lg text-center text-sm opacity-80">{portal.spotify_description}</p>}
        <iframe src={embed} title="Playlist da coleção no Spotify" className="mt-6 w-full rounded-xl border border-[var(--portal-accent)]/30"
          height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      </section>}

      <section id="portal-inspiracoes" data-portal-reveal className="portal-reveal mx-auto max-w-4xl scroll-mt-10 px-5 py-16 md:px-8">
        {magicWorld && <PortalChristmasDecor scene="inspirations" />}
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Nos bastidores de cada chama</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">Conheça as inspirações</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-80">
            Pequenos detalhes, cenas e histórias que deram vida aos aromas deste universo.
          </p>
        </div>
        {fragments.length>0 ? <div className="grid gap-5 sm:grid-cols-2">
          {fragments.map(fragment=><article key={fragment.id} className="portal-inspiration-card p-6">
            {fragment.image_url && <img src={fragment.image_url} alt={fragment.caption||fragment.title}
              className="mb-5 aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />}
            <h3 className="font-display text-2xl">{fragment.title}</h3>
            {fragment.reference && <p className="mt-2 text-xs italic text-[var(--portal-accent)]">{fragment.reference}</p>}
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed opacity-90">{fragment.body}</p>
            {fragment.context && <p className="mt-3 text-sm italic opacity-70">{fragment.context}</p>}
          </article>)}
        </div> : <div className="portal-inspiration-card px-7 py-11 text-center">
          <BookOpenText size={30} aria-hidden="true" className="mx-auto text-[var(--portal-accent)]"/>
          <p className="mt-4 font-display text-xl">As histórias por trás das velas serão reveladas aqui.</p>
          <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
            Novos relatos e inspirações serão adicionados a esta coleção.
          </p>
        </div>}
      </section>

      <section data-portal-reveal className="portal-reveal portal-carousel-section mt-12 py-16">
        {magicWorld && <PortalChristmasDecor scene="gallery" />}
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Edição especial de Natal</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">Um vislumbre da coleção</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm opacity-80">Imagens, detalhes e pequenos encantamentos que merecem ser descobertos.</p>
        </div>
        {carouselItems.length>0 ? <div className="portal-gallery-marquee mt-10 overflow-hidden"
          aria-label="Fotos da coleção de Natal em rolagem horizontal">
          <div className="portal-gallery-track flex w-max">
            {[0,1].map(copy=><div key={copy} className="flex shrink-0 gap-4 pr-4"
              aria-hidden={copy===1}>
              {carouselItems.map((item,index)=><div key={item.id+"-"+copy+"-"+index}
                className="portal-gallery-photo relative w-44 shrink-0 sm:w-56">
                {item.url ? <a href={item.url} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--portal-accent)]">
                  <img src={item.image_url} alt={copy===0?item.title:""} className="aspect-square w-full rounded-xl object-cover" loading="lazy"/>
                </a> : <img src={item.image_url} alt={copy===0?item.title:""} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />}
                <p className="mt-3 text-center font-display text-base">{item.title}</p>
                {item.description && <p className="mt-1 text-center text-xs opacity-75">{item.description}</p>}
              </div>)}
            </div>)}
          </div>
        </div> : <div className="portal-gallery-empty mx-auto mt-10 flex max-w-xl items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center text-sm opacity-80">
          As fotos da edição natalina aparecerão aqui. Adicione-as em “Meus Portais NFC” na administração.
        </div>}
      </section>
      </main>

      <p className="pb-8 text-center text-sm italic text-muted-foreground">
        Hiraeth — Onde a Chama Acesa te Espera
      </p>
      <SiteFooter />
      </div>
    </div>
  );
}
