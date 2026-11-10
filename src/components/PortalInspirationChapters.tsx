import { useState } from "react";
import { Flame, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;

export function PortalInspirationCard({ fragment, featured = false, houseDecor = false }: { fragment: Fragment; featured?: boolean; houseDecor?: boolean }) {
  const house = houseDecor ? ({ 3: "leao", 4: "texugo", 5: "serpente", 6: "aguia" } as Record<number, string>)[fragment.position ?? -1] : undefined;
  return <article className={`portal-inspiration-card ${house ? `portal-house-card portal-house-card--${house}` : ""} ${featured ? "px-6 py-8 sm:px-10 sm:py-10" : "p-6 sm:p-8"}`}>
    {fragment.image_url && <img src={fragment.image_url} alt={fragment.caption || fragment.title}
      className="mb-6 aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />}
    <h4 className={`font-display portal-story-title ${featured ? "text-2xl sm:text-3xl" : "text-2xl"}`}>{fragment.title}</h4>
    {fragment.reference && <p className="mt-3 text-sm italic text-[var(--portal-accent)]">{fragment.reference}</p>}
    <p className="mt-5 whitespace-pre-line text-sm leading-7 opacity-90 sm:text-base">{fragment.body}</p>
    {fragment.context && <p className="mt-5 border-t border-[var(--portal-accent)]/20 pt-4 text-sm italic text-[var(--portal-accent)]">{fragment.context}</p>}
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
  const natal = fragments.filter(fragment => typeof fragment.position === "number" && fragment.position >= 7 && fragment.position <= 9);
  const other = fragments.filter(fragment => typeof fragment.position !== "number" || fragment.position < 1 || fragment.position > 10);
  const letters = at(10);

  return <div className="space-y-12 sm:space-y-16">
    {at(1).map(fragment => <section key={fragment.id} aria-label="História da coleção" className="mx-auto max-w-3xl">
      <p className="mb-4 text-center text-xs uppercase tracking-[.24em] text-[var(--portal-accent)]">Capítulo I · O início</p>
      <PortalInspirationCard fragment={fragment} featured />
    </section>)}

    {at(2).map(fragment => <section key={fragment.id} aria-label="História da Vela Seletora" className="mx-auto max-w-3xl">
      <p className="mb-4 text-center text-xs uppercase tracking-[.24em] text-[var(--portal-accent)]">Capítulo II · A descoberta</p>
      <PortalInspirationCard fragment={fragment} featured />
    </section>)}

    {houses.length > 0 && <section aria-labelledby="portal-houses-title">
      <p className="text-center text-xs uppercase tracking-[.24em] text-[var(--portal-accent)]">Capítulo III · Pertencimento</p>
      <h3 id="portal-houses-title" className="portal-script-title mb-8 mt-3 text-center">Quatro casas, quatro essências</h3>
      <div className="portal-house-palette" aria-hidden="true">
        {["leao", "texugo", "aguia", "serpente"].map(house =>
          <span key={house} className={`portal-house-ribbon portal-house-ribbon--${house}`}/>)}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {houses.map(fragment => <PortalInspirationCard key={fragment.id} fragment={fragment} houseDecor />)}
      </div>
    </section>}

    {natal.length > 0 && <section aria-labelledby="portal-natal-inspiration-title">
      <p className="text-center text-xs uppercase tracking-[.24em] text-[var(--portal-accent)]">Capítulo IV · A magia do Natal</p>
      <h3 id="portal-natal-inspiration-title" className="mb-8 mt-3 text-center font-display text-3xl sm:text-4xl">O Natal no Mundo da Magia</h3>
      <div className="mx-auto mb-5 max-w-3xl space-y-5">
        {at(7).map(fragment => <PortalInspirationCard key={fragment.id} fragment={fragment} featured />)}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {natal.filter(fragment => fragment.position !== 7).map(fragment =>
          <PortalInspirationCard key={fragment.id} fragment={fragment} />)}
      </div>
    </section>}

    {other.length > 0 && <section aria-label="Outras inspirações" className="grid gap-5 sm:grid-cols-2">
      {other.map(fragment => <PortalInspirationCard key={fragment.id} fragment={fragment} />)}
    </section>}

    {letters.map(fragment => <section key={fragment.id} aria-labelledby="portal-letter-title" className="mx-auto max-w-3xl text-center">
      <p className="text-xs uppercase tracking-[.24em] text-[var(--portal-accent)]">Capítulo V · Uma mensagem para você</p>
      <h3 id="portal-letter-title" className="portal-script-title mt-3">Uma carta da Guardiã da Chama</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 opacity-80">
        Algumas palavras são guardadas até o momento certo de serem encontradas.
      </p>
      <button type="button" aria-expanded={letterOpen} aria-controls="portal-letter-content"
        onClick={() => setLetterOpen(value => !value)}
        className="group mx-auto mt-8 block w-full max-w-sm rounded-xl p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--portal-accent)]">
        {!letterOpen ? <>
          <span className="relative block h-48 overflow-hidden rounded-lg border border-[#b7a080] bg-[#d7c6a5] shadow-[0_15px_40px_rgba(0,0,0,.28)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none">
            <span className="absolute inset-0 bg-[#e9ddc4] [clip-path:polygon(0_0,50%_62%,100%_0)]" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 h-[64%] bg-[#e3d2ae] [clip-path:polygon(0_100%,50%_0,100%_100%)]" aria-hidden="true" />
            <span className="absolute left-1/2 top-[55%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#6e7538] bg-[#878e47] text-[#f7efda] shadow-md" aria-hidden="true"><Flame size={27}/></span>
          </span>
          <span className="mt-4 block text-sm font-medium text-[var(--portal-accent)]">Toque no selo verde para abrir a carta</span>
        </> : <span className="inline-flex items-center gap-2 rounded-full border border-[var(--portal-accent)] px-6 py-3 text-sm"><X size={16}/> Fechar carta</span>}
      </button>
      {letterOpen && <article id="portal-letter-content" className="mt-6 rounded-lg border border-[#c4ad7b] bg-[#f7efda] px-6 py-8 text-left text-[#513c2b] shadow-[0_16px_40px_rgba(0,0,0,.24)] sm:px-12 sm:py-12">
        <h4 className="portal-story-title mb-6 text-center text-2xl sm:text-3xl">{fragment.title}</h4>
        <p className="whitespace-pre-line font-serif text-base leading-8 sm:text-lg">{fragment.body}</p>
      </article>}
    </section>)}
  </div>;
}
