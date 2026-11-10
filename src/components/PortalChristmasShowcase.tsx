import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>());
  const previousPosition = useRef<number | null>(null);
  const candles = [8, 9]
    .map(position => fragments.find(fragment => fragment.position === position))
    .filter((fragment): fragment is Fragment => Boolean(fragment));
  const selected = candles.find(fragment => fragment.position === opened);

  useEffect(() => {
    if (opened === null) return;
    previousPosition.current = opened;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpened(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRefs.current.get(previousPosition.current ?? -1)?.focus();
    };
  }, [opened]);

  if (!candles.length) {
    return <p className="mx-auto max-w-xl py-8 text-center text-sm opacity-80">
      As histórias das duas velas de Natal serão reveladas aqui em breve.
    </p>;
  }

  return <div className="portal-natal-discovery">
    <div className="portal-natal-discovery__grid">
      {candles.map(fragment => {
        const position = fragment.position ?? -1;
        const photoUrl = fragment.image_url || defaultPhotos[position];
        return <button key={fragment.id} type="button"
          ref={node => { if (node) triggerRefs.current.set(position, node); else triggerRefs.current.delete(position); }}
          className="portal-natal-discovery__candle"
          aria-label={`Conhecer ${fragment.title}`}
          aria-haspopup="dialog"
          onClick={() => setOpened(position)}>
          <span className="portal-natal-discovery__picture">
            {photoUrl ? <img className="portal-natal-discovery__photo" src={photoUrl}
              alt={`Vela ${fragment.title}`} loading="lazy" /> : <span className="portal-natal-discovery__placeholder" aria-hidden="true">
              <span className="portal-natal-discovery__illustration"><span className="portal-natal-discovery__wick"/><span className="portal-natal-discovery__jar"/></span>
              <span className="portal-natal-discovery__photo-pending">Fotografia em breve</span>
            </span>}
          </span>
          <span className="portal-natal-discovery__name">{fragment.title}</span>
        </button>;
      })}
    </div>

    {selected && <div className="portal-natal-modal-backdrop" onMouseDown={event => {
        if (event.target === event.currentTarget) setOpened(null);
      }}>
      <section role="dialog" aria-modal="true" aria-labelledby="portal-natal-modal-title"
        aria-describedby="portal-natal-modal-story" className="portal-natal-modal">
        <button ref={closeRef} type="button" className="portal-natal-modal__close"
          aria-label="Fechar informações da vela" onClick={() => setOpened(null)}>
          <X size={20} aria-hidden="true"/>
        </button>
        <div className="portal-natal-modal__intro">
          <p className="portal-natal-discovery__kicker">A história por trás da chama</p>
          <h3 id="portal-natal-modal-title" className="portal-natal-discovery__reveal-title">{selected.title}</h3>
          <p className="portal-natal-discovery__teaser">{previewLines[selected.position ?? -1]}</p>
          {selected.context && <p className="portal-natal-discovery__aroma">{selected.context}</p>}
        </div>
        <p id="portal-natal-modal-story" className="portal-natal-discovery__story">{selected.body}</p>
        <button type="button" className="portal-natal-discovery__close" onClick={() => setOpened(null)}>
          <ArrowLeft size={16} aria-hidden="true"/> Voltar às velas
        </button>
      </section>
    </div>}
  </div>;
}
