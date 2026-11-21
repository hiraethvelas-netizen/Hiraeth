import { useState } from "react";
import { ChevronDown, Sparkles, Wind } from "lucide-react";
import { summerInspirationsFromTheme } from "@/lib/summer-inspirations";
import "./SummerInspirationExperience.css";

type Reveal = "sensacao" | "piramide" | null;

/** Portal de Verão only. Never displays candle photos or buy buttons pre-launch. */
export function SummerInspirationExperience({ theme }: { theme: unknown }) {
  const entries = summerInspirationsFromTheme(theme).filter(item => item.visible);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal>(null);
  const selected = entries.find(item => item.id === selectedId);
  const notes = selected?.pyramid;
  const hasNotes = Boolean(notes?.saida.trim() || notes?.corpo.trim() || notes?.fundo.trim());

  function choose(id: string) {
    setSelectedId(current => current === id ? null : id);
    setReveal(null);
  }
  function toggle(next: Exclude<Reveal, null>) {
    setReveal(current => current === next ? null : next);
  }

  return <section className="summer-sensations" aria-labelledby="summer-sensations-title">
    <div className="summer-sensations__decoration" aria-hidden="true">✺</div>
    <p className="summer-sensations__eyebrow">Um verão para guardar</p>
    <h2 id="summer-sensations-title">Colecione <em>sensações.</em></h2>
    <p className="summer-sensations__intro">Antes de conhecer cada chama, descubra as memórias que imaginei para esta coleção.</p>
    <p className="summer-sensations__hint">Toque em cada símbolo para descobrir uma nova sensação.</p>

    <div className="summer-sensations__grid" role="group" aria-label="Seis sensações do verão">
      {entries.map((item, index) => <button
        key={item.id} type="button"
        className={`summer-sensation-circle summer-sensation-circle--${index % 6}${selectedId === item.id ? " is-selected" : ""}`}
        aria-expanded={selectedId === item.id}
        aria-controls="summer-sensation-reveal"
        aria-label={`Descobrir inspiração: ${item.title}`}
        onClick={() => choose(item.id)}>
          <span className="summer-sensation-circle__emoji" aria-hidden="true">{item.emoji}</span>
          <span className="summer-sensation-circle__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className="summer-sensation-circle__name">Descubra</span>
      </button>)}
    </div>

    {selected && <article id="summer-sensation-reveal" className="summer-sensation-detail"
      aria-label={`Inspiração de ${selected.title}`}>
      <span className="summer-sensation-detail__symbol" aria-hidden="true">{selected.emoji}</span>
      <p className="summer-sensation-detail__eyebrow">Uma memória em forma de chama</p>
      <h3>{selected.title}</h3>
      <p className="summer-sensation-detail__teaser">{selected.teaser}</p>
      <div className="summer-sensation-detail__actions">
        <button type="button" className={reveal === "sensacao" ? "is-active" : ""}
          aria-expanded={reveal === "sensacao"} aria-controls="summer-sensacao-text"
          onClick={() => toggle("sensacao")}>
          <Sparkles size={17} aria-hidden="true"/> Descubra a sensação <ChevronDown size={15} aria-hidden="true"/>
        </button>
        <button type="button" className={reveal === "piramide" ? "is-active" : ""}
          aria-expanded={reveal === "piramide"} aria-controls="summer-piramide-text"
          onClick={() => toggle("piramide")}>
          <Wind size={17} aria-hidden="true"/> Descubra a pirâmide olfativa <ChevronDown size={15} aria-hidden="true"/>
        </button>
      </div>
      {reveal === "sensacao" && <div id="summer-sensacao-text" className="summer-sensation-detail__panel"
        role="region" aria-label="Descubra a sensação">
          <p className="summer-sensation-detail__story">{selected.sensation}</p>
        </div>}
      {reveal === "piramide" && <div id="summer-piramide-text" className="summer-sensation-detail__panel" role="region"
        aria-label="Descubra a pirâmide olfativa">
          {hasNotes ? <div className="summer-pyramid">
            {([["Saída",notes?.saida],["Corpo",notes?.corpo],["Fundo",notes?.fundo]] as const).map(([name, value]) =>
              <div key={name} className="summer-pyramid__row"><strong>{name}</strong>
                <span>{value?.trim() || "Notas a revelar"}</span></div>)}
          </div> : <div className="summer-pyramid__secret">
            <span aria-hidden="true">✺</span>
            <p>As notas desta memória ainda são um segredo.</p>
            <small>A pirâmide olfativa será revelada em breve.</small>
          </div>}
        </div>}
      </article>}
    {entries.length === 0 && <p className="summer-sensations__empty">Novas inspirações chegarão em breve.</p>}
    <p className="summer-sensations__closing">Primeiro, a sensação. Depois, a chama.</p>
  </section>;
}
