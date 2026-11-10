import { useState } from "react";
import { ChevronDown, Flame, Gift, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import entreFiosPhoto from "@/assets/natal-entre-fios.webp";
import grandeSalaoPhoto from "@/assets/natal-grande-salao.webp";

type Fragment = Tables<"portal_fragments">;
type Props = { fragments: Fragment[] };

const defaultPhotos: Record<number, string> = { 8: entreFiosPhoto, 9: grandeSalaoPhoto };

const previewLines: Record<number, string> = {
  8: "Um presente feito à mão. Um carinho que aquece até os dias mais frios.",
  9: "Um salão iluminado, amigos reunidos e a magia de viver o Natal no castelo.",
};

export function PortalChristmasShowcase({ fragments }: Props) {
  const [opened, setOpened] = useState<number | null>(null);
  const candles = [8, 9]
    .map(position => fragments.find(fragment => fragment.position === position))
    .filter((fragment): fragment is Fragment => Boolean(fragment));

  if (!candles.length) {
    return <p className="mx-auto max-w-xl py-8 text-center text-sm opacity-80">
      As histórias das duas velas de Natal serão reveladas aqui em breve.
    </p>;
  }

  const selected = candles.find(fragment => fragment.position === opened);

  return <div className="portal-natal-discovery">
    <div className="portal-natal-discovery__grid">
      {candles.map(fragment => {
        const active = fragment.position === opened;
        const photoUrl = fragment.image_url || defaultPhotos[fragment.position ?? -1];
        return <button key={fragment.id} type="button"
          className={`portal-natal-discovery__candle ${active ? "is-selected" : ""}`}
          aria-expanded={active} aria-controls="portal-natal-discovery-panel"
          onClick={() => setOpened(active ? null : fragment.position)}>
          <span className="portal-natal-discovery__picture">
            {photoUrl ? <img className="portal-natal-discovery__photo" src={photoUrl}
              alt={`Vela ${fragment.title}`} loading="lazy" /> : <span className="portal-natal-discovery__placeholder" aria-hidden="true">
              <span className="portal-natal-discovery__illustration">
                <span className="portal-natal-discovery__wick"/>
                <span className="portal-natal-discovery__jar"/>
              </span>
              <span className="portal-natal-discovery__photo-pending">Fotografia em breve</span>
            </span>}
          </span>
          <span className="portal-natal-discovery__name">{fragment.title}</span>
          <span className="portal-natal-discovery__hint">
            <Sparkles size={14} aria-hidden="true" />
            {active ? "Fechar história" : "Toque para descobrir"}
            <ChevronDown size={14} aria-hidden="true" className={active ? "rotate-180" : ""}/>
          </span>
        </button>;
      })}
    </div>

    {selected && <section id="portal-natal-discovery-panel" className="portal-natal-discovery__reveal"
      aria-live="polite" aria-labelledby="portal-natal-reveal-heading">
      <div className="portal-natal-discovery__seal"><Flame size={19} aria-hidden="true"/></div>
      <p className="portal-natal-discovery__kicker">A história por trás da chama</p>
      <h3 id="portal-natal-reveal-heading" className="portal-natal-discovery__reveal-title">{selected.title}</h3>
      <p className="portal-natal-discovery__teaser">{previewLines[selected.position ?? -1]}</p>
      {selected.context && <p className="portal-natal-discovery__aroma">
        <Gift size={16} aria-hidden="true"/>
        {selected.context}
      </p>}
      <p className="portal-natal-discovery__story">{selected.body}</p>
      <button type="button" className="portal-natal-discovery__close" onClick={() => setOpened(null)}>
        <ChevronDown size={15} className="rotate-180" aria-hidden="true" /> Recolher história
      </button>
    </section>}
  </div>;
}
