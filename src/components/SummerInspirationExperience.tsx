import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Sparkles, Wind, X } from "lucide-react";
import { summerInspirationsFromTheme } from "@/lib/summer-inspirations";
import "./SummerInspirationExperience.css";

type Reveal = "sensacao" | "piramide" | null;

/** As paletas pertencem às inspirações, não à ordem em que aparecem no painel. */
const paletteById: Record<string, string> = {
  "flores-de-janeiro": "flores",
  "sol-na-pele": "sol",
  "caipirinha": "caipirinha",
  "sombra-fresca": "sombra",
  "aguas-de-cristal": "aguas",
  "brisa-do-mar": "brisa",
};

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Portal de Verão only. No product photos or purchase buttons before launch. */
export function SummerInspirationExperience({ theme }: { theme: unknown }) {
  const entries = summerInspirationsFromTheme(theme).filter(item => item.visible);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const selected = entries.find(item => item.id === selectedId);
  const notes = selected?.pyramid;
  const hasNotes = Boolean(notes?.saida.trim() || notes?.corpo.trim() || notes?.fundo.trim());

  function choose(id: string, trigger: HTMLButtonElement) {
    openerRef.current = trigger;
    setSelectedId(id);
    setReveal(null);
  }

  function close() {
    setSelectedId(null);
    setReveal(null);
  }

  function toggle(next: Exclude<Reveal, null>) {
    setReveal(current => current === next ? null : next);
  }

  // O painel fica sobre a tela atual, não abaixo das bolinhas.
  // Restaura o foco e o scroll quando a janela é fechada.
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [selectedId, selected?.id]);

  return <>
    <section className="summer-sensations" aria-labelledby="summer-sensations-title">
      <h2 id="summer-sensations-title">Colecione <em>sensações.</em></h2>
      <p className="summer-sensations__hint">Toque em cada símbolo e sinta um pedacinho do nosso verão.</p>

      <div className="summer-sensations__grid" role="group" aria-label="Sensações do verão">
        {entries.map(item => <button
          key={item.id}
          type="button"
          className={`summer-sensation-circle summer-sensation-circle--${paletteById[item.id] ?? "default"}`}
          aria-haspopup="dialog"
          aria-label={`Conhecer a inspiração de ${item.title}`}
          onClick={event => choose(item.id, event.currentTarget)}>
            <span className="summer-sensation-circle__emoji" aria-hidden="true">{item.emoji}</span>
          </button>)}
      </div>

      {entries.length === 0 && <p className="summer-sensations__empty">Novas inspirações chegarão em breve.</p>}
      <div className="summer-sensations__postcards" aria-hidden="true">
        <div className="summer-sensations__postcard summer-sensations__postcard--hibiscus">
          <img src="https://images.unsplash.com/photo-1554569258-670a25302596?w=580&q=77" alt="" loading="lazy" />
        </div>
        <div className="summer-sensations__postcard summer-sensations__postcard--pool">
          <img src="https://images.unsplash.com/photo-1713991767449-6d3f6df573b7?w=580&q=77" alt="" loading="lazy" />
        </div>
        <div className="summer-sensations__postcard summer-sensations__postcard--beach">
          <img src="https://static.wixstatic.com/media/a98afb_48b907925d2a4b0287373ddd0eaefb67~mv2.jpg/v1/fill/w_1000%2Ch_800%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01/a98afb_48b907925d2a4b0287373ddd0eaefb67~mv2.jpg" alt="" loading="lazy" />
        </div>
        <span className="summer-sensations__postcard-sparkle">✺</span>
      </div>
    </section>

    {selected && typeof document !== "undefined" && createPortal(
      <div className="summer-sensation-overlay summer-sensation-overlay--open" onClick={event => {
        if (event.target === event.currentTarget) close();
      }}>
        <div ref={dialogRef} role="dialog" aria-modal="true"
          aria-labelledby="summer-sensation-dialog-title"
          aria-describedby="summer-sensation-dialog-teaser"
          className={`summer-sensation-dialog summer-sensation-dialog--${paletteById[selected.id] ?? "default"}`}
          tabIndex={-1}>
          <button ref={closeRef} type="button" className="summer-sensation-dialog__close"
            onClick={close} aria-label="Fechar inspiração"><X size={21} aria-hidden="true" /></button>
          <span className="summer-sensation-dialog__symbol" aria-hidden="true">{selected.emoji}</span>
          <h3 id="summer-sensation-dialog-title">{selected.title}</h3>
          <p id="summer-sensation-dialog-teaser" className="summer-sensation-dialog__teaser">{selected.teaser}</p>
          <div className="summer-sensation-dialog__actions">
            <button type="button" className={reveal === "sensacao" ? "is-active" : ""}
              aria-expanded={reveal === "sensacao"} aria-controls="summer-sensacao-text"
              onClick={() => toggle("sensacao")}>
              <Sparkles size={17} aria-hidden="true"/> Descubra a sensação <ChevronDown size={15} aria-hidden="true"/>
            </button>
            <button type="button" className={reveal === "piramide" ? "is-active" : ""}
              aria-expanded={reveal === "piramide"} aria-controls="summer-piramide-text"
              onClick={() => toggle("piramide")}>
              <Wind size={17} aria-hidden="true"/> Pirâmide olfativa <ChevronDown size={15} aria-hidden="true"/>
            </button>
          </div>

          {reveal === "sensacao" && <div id="summer-sensacao-text" className="summer-sensation-dialog__panel"
            role="region" aria-label="Descubra a sensação">
            <p className="summer-sensation-dialog__story">{selected.sensation}</p>
          </div>}
          {reveal === "piramide" && <div id="summer-piramide-text" className="summer-sensation-dialog__panel"
            role="region" aria-label="Descubra a pirâmide olfativa">
            {hasNotes ? <div className="summer-pyramid">
              {([["Saída", notes?.saida], ["Corpo", notes?.corpo], ["Fundo", notes?.fundo]] as const).map(([name, value]) =>
                <div key={name} className="summer-pyramid__row">
                  <strong>{name}</strong><span>{value?.trim() || "Notas a revelar"}</span>
                </div>)}
            </div> : <div className="summer-pyramid__secret">
              <span aria-hidden="true">✺</span>
              <p>Um segredo para revelar em breve.</p>
            </div>}
          </div>}
        </div>
      </div>,
      document.body
    )}
  </>;
}
