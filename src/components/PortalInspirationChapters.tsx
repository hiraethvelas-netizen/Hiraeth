import { useState } from "react";
import { BookOpen, ChevronDown, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { PortalChristmasShowcase } from "@/components/PortalChristmasShowcase";
import { PortalFestiveAccents } from "@/components/PortalFestiveAccents";

type Fragment = Tables<"portal_fragments">;
type House = "leao" | "texugo" | "serpente" | "aguia";

const houseByPosition: Record<number, House> = {
  3: "leao",
  4: "texugo",
  5: "serpente",
  6: "aguia",
};

const housePhotoByPosition: Partial<Record<number, string>> = {
  3: "/portal-casa-leao.avif",
  4: "/portal-casa-texugo.avif",
  6: "/portal-casa-aguia.avif",
};

const teasers: Record<number, string> = {
  1: "Um universo que me acolheu e, aos poucos, ganhou perfume e chama.",
  2: "Uma vela branca, quatro possibilidades e a surpresa que só a chama revela.",
  3: "Madeira, lareira e a elegância de uma casa corajosa.",
  4: "Baunilha, acolhimento e o cheiro de se sentir em casa.",
  5: "Uma fragrância marcante para uma casa de personalidade forte.",
  6: "Livros, uma cabana aquecida e o frescor de uma floresta de inverno.",
  7: "Duas velas, duas lembranças de Natal.",
  8: "Um presente feito com carinho e o conforto de ser lembrado.",
  9: "Luzes no salão, pinheiros e amigos reunidos.",
};

export function PortalInspirationCard({ fragment, featured = false, houseDecor = false }: {
  fragment: Fragment; featured?: boolean; houseDecor?: boolean;
}) {
  const house = houseDecor ? houseByPosition[fragment.position ?? -1] : undefined;
  return <article className={`portal-inspiration-card ${house ? `portal-house-card portal-house-card--${house}` : ""} ${featured ? "px-6 py-8 sm:px-10 sm:py-10" : "p-6 sm:p-8"}`}>
    {fragment.image_url && <img src={fragment.image_url} alt={fragment.caption || fragment.title}
      className="mb-6 aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />}
    <h4 className={`font-display portal-story-title ${featured ? "text-2xl sm:text-3xl" : "text-2xl"}`}>{fragment.title}</h4>
    {fragment.reference && <p className="mt-3 text-sm italic text-[var(--portal-accent)]">{fragment.reference}</p>}
    <p className="mt-5 whitespace-pre-line text-sm leading-7 opacity-90 sm:text-base">{fragment.body}</p>
    {fragment.context && <p className="mt-5 border-t border-[var(--portal-accent)]/20 pt-4 text-sm italic text-[var(--portal-accent)]">{fragment.context}</p>}
  </article>;
}

function RevealStoryCard({ fragment, kind = "story", featured = false }: {
  fragment: Fragment; kind?: "story" | "house"; featured?: boolean;
}) {
  const [aromaOpen, setAromaOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const house = kind === "house" ? houseByPosition[fragment.position ?? -1] : undefined;
  const hasAroma = Boolean(fragment.context?.trim().toLowerCase().startsWith("aroma:"));
  const contentId = `portal-story-${fragment.id}`;
  const aromaId = `portal-aroma-${fragment.id}`;
  const position = fragment.position ?? -1;
  const housePhoto = fragment.image_url || housePhotoByPosition[position];
  const [storyText, pyramidText] = (fragment.body ?? "").split(/\n\nPirâmide olfativa\s*\n\n/i);
  const pyramidRows = house && pyramidText ? pyramidText.split(/\n\n/).map(block => {
    const [heading, ...notes] = block.split("\n");
    return { heading, notes: notes.join(" ").trim() };
  }).filter(row => row.heading && row.notes) : [];

  return <article className={`portal-discovery-card ${house ? `portal-house-card portal-house-card--${house}` : ""} ${featured ? "portal-discovery-card--featured" : ""}`}>
    {house ? <figure className="portal-house-polaroid">
      <div className="portal-house-polaroid__photoWrap">
        {housePhoto
          ? <img src={housePhoto} alt={fragment.caption || `Velas Hiraeth da ${fragment.title}`}
              className="portal-house-polaroid__photo" loading="lazy" />
          : <div className="portal-house-polaroid__placeholder" role="img"
              aria-label={`Foto da ${fragment.title} ainda não enviada`}>
              <span>Fotografia em breve</span>
            </div>}
      </div>
      <figcaption className="portal-house-polaroid__label">
        <h4>{fragment.title}</h4>
      </figcaption>
    </figure> : <>
      {fragment.image_url && <img src={fragment.image_url} alt={fragment.caption || fragment.title}
        className="portal-discovery-card__image" loading="lazy" />}
      <h4 className="portal-story-title portal-discovery-card__title">{fragment.title}</h4>
    </>}
    <p className="portal-discovery-card__teaser">{house ? (fragment.reference || teasers[position]) : (teasers[position] || fragment.reference || "Uma história guardada entre páginas e chamas.")}</p>
    <div className="portal-discovery-card__actions">
      {hasAroma && <button type="button" aria-expanded={aromaOpen} aria-controls={aromaId}
        className="portal-discovery-card__button portal-discovery-card__button--primary"
        onClick={() => setAromaOpen(value => !value)}>
        <Sparkles size={16} aria-hidden="true" />
        {aromaOpen ? "Ocultar aroma" : "Revelar aroma"}
      </button>}
      <button type="button" aria-expanded={storyOpen} aria-controls={contentId}
        className="portal-discovery-card__button" onClick={() => setStoryOpen(value => !value)}>
        <BookOpen size={16} aria-hidden="true" />
        {storyOpen ? "Fechar história" : "Conhecer a inspiração"}
        <ChevronDown size={15} aria-hidden="true" className={storyOpen ? "rotate-180" : ""} />
      </button>
    </div>
    {hasAroma && aromaOpen && <div id={aromaId} className="portal-discovery-card__aroma" role="region" aria-label={`Aroma de ${fragment.title}`}>
      <span className="portal-discovery-card__aroma-label">Essência revelada</span>
      <strong>{fragment.context?.replace(/^aroma:\s*/i, "")}</strong>
      {pyramidRows.length > 0 && <section className="portal-house-pyramid" aria-label={`Pirâmide olfativa da ${fragment.title}`}>
        <h5>Pirâmide olfativa</h5>
        {pyramidRows.map(row => <div className="portal-house-pyramid__row" key={row.heading}>
          <strong>{row.heading}</strong>
          <span>{row.notes}</span>
        </div>)}
      </section>}
    </div>}
    {storyOpen && <div id={contentId} className="portal-discovery-card__story" role="region" aria-label={`História de ${fragment.title}`}>
      {!house && fragment.reference && <p className="mb-3 text-sm italic text-[var(--portal-accent)]">{fragment.reference}</p>}
      <p className="whitespace-pre-line text-sm leading-7 sm:text-base">{storyText}</p>
      {fragment.context && !hasAroma && <p className="mt-4 border-t border-white/15 pt-3 text-sm italic">{fragment.context}</p>}
    </div>}
  </article>;
}


export function PortalInspirationChapters({ fragments, magicWorld }: { fragments: Fragment[]; magicWorld: boolean }) {
  const [letterOpen, setLetterOpen] = useState(false);
  if (!magicWorld) {
    return <div className="grid gap-5 sm:grid-cols-2">
      {fragments.map(fragment => <PortalInspirationCard key={fragment.id} fragment={fragment} />)}
    </div>;
  }

  const at = (position: number) => fragments.filter(fragment => fragment.position === position);
  const houses = fragments.filter(fragment => typeof fragment.position === "number" && fragment.position >= 3 && fragment.position <= 6);
  const christmas = fragments.filter(fragment => typeof fragment.position === "number" && fragment.position >= 7 && fragment.position <= 9);
  const other = fragments.filter(fragment => typeof fragment.position !== "number" || fragment.position < 1 || fragment.position > 10);

  return <div className="portal-discovery space-y-12 sm:space-y-16">
    {at(1).length > 0 && <section id="inspiracao-origem" aria-label="Como a coleção nasceu" className="scroll-mt-8">
      <div className="mx-auto max-w-3xl">
        {at(1).map(fragment => <RevealStoryCard key={fragment.id} fragment={fragment} featured />)}
      </div>
    </section>}

    {at(2).length > 0 && <section id="inspiracao-seletora" aria-label="A história da Vela Seletora" className="scroll-mt-8">
      <div className="mx-auto max-w-3xl">
        {at(2).map(fragment => <RevealStoryCard key={fragment.id} fragment={fragment} featured />)}
      </div>
    </section>}

    {houses.length > 0 && <section id="inspiracao-casas" aria-labelledby="portal-houses-title" className="scroll-mt-8">
      <h3 id="portal-houses-title" className="portal-script-title mb-5 mt-2 text-center">Quatro casas, quatro essências</h3>
      <div className="portal-house-palette" aria-hidden="true">
        {["leao", "texugo", "aguia", "serpente"].map(house =>
          <span key={house} className={`portal-house-ribbon portal-house-ribbon--${house}`}/>)}
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {houses.map(fragment => <RevealStoryCard key={fragment.id} fragment={fragment} kind="house" />)}
      </div>
    </section>}

    {christmas.length > 0 && <section id="inspiracao-natal" aria-labelledby="portal-natal-inspiration-title" className="scroll-mt-8">
      <div className="portal-world--christmas">
        <div className="portal-natal-highlight">
          <PortalFestiveAccents variant="natal" />
          <div className="mb-9 text-center">
            <h3 id="portal-natal-inspiration-title" className="portal-script-title mt-3">O Natal no Mundo da Magia</h3>
            <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 opacity-85 sm:text-base">
              {at(7)[0]?.body?.split("\n\n")[0] || "O Natal naquele castelo sempre me lembra amizade, presentes feitos com carinho e um salão iluminado de magia. Foi desse aconchego que nasceram duas velas especiais. Toque em cada uma para conhecer sua história."}
            </p>
          </div>
          <PortalChristmasShowcase fragments={christmas.filter(fragment => fragment.position === 8 || fragment.position === 9)} />
        </div>
      </div>
    </section>}

    {other.length > 0 && <section aria-label="Outras inspirações" className="grid items-start gap-4 sm:grid-cols-2">
      {other.map(fragment => <RevealStoryCard key={fragment.id} fragment={fragment} />)}
    </section>}


  </div>;
}
