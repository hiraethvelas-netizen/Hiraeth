import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, Clapperboard, Tv2 } from "lucide-react";
import { isSafePortalUrl } from "@/lib/portal-experience";
import { summerRecommendationsFromTheme, summerCoverFallbacks, summerCoverBackups, type SummerRecommendationKind } from "@/lib/summer-recommendations";
import "./SummerRecommendations.css";

const STORAGE_KEY = "hiraeth-verao-checklist-v1";
type Progress = Record<string, { done: boolean; rating: number }>;
const categories = [
  { key: "livro", label: "Livros", action: "Descubra uma leitura de verão", hint: "Páginas para ler ao sol", Icon: BookOpen },
  { key: "serie", label: "Séries", action: "Descubra uma série de verão", hint: "Uma temporada para maratonar", Icon: Tv2 },
  { key: "filme", label: "Filmes", action: "Descubra um filme de verão", hint: "Cinema com gosto de férias", Icon: Clapperboard },
] as const;

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).flatMap(([id, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      const done = item["done"] === true;
      const rating = Number(item["rating"]);
      return [[id, { done, rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0 }]];
    }));
  } catch {
    return {};
  }
}

export function SummerRecommendations({ theme }: { theme: unknown }) {
  const source = theme && typeof theme === "object" && !Array.isArray(theme)
    ? (theme as Record<string, unknown>)["summer"] : undefined;
  const recommendations = summerRecommendationsFromTheme(source).filter(item => item.visible && item.title.trim());
  const [selected, setSelected] = useState<SummerRecommendationKind | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [ready, setReady] = useState(false);
  const [imageAttempts, setImageAttempts] = useState<Record<string, number>>({});

  useEffect(() => {
    setProgress(loadProgress());
    setReady(true);
  }, []);

  function update(id: string, patch: Partial<{ done: boolean; rating: number }>) {
    const next: Progress = { ...progress, [id]: { done: false, rating: 0, ...progress[id], ...patch } };
    setProgress(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private browsing may disable storage */ }
  }

  const visible = selected ? recommendations.filter(item => item.kind === selected) : [];
  const selectedInfo = categories.find(item => item.key === selected);
  const completed = recommendations.filter(item => progress[item.id]?.done).length;

  return <section className="summer-discovery summer-content-section" id="indicacoes-de-verao" aria-labelledby="summer-discovery-title">
    <div className="summer-section-intro">
      <span className="summer-star" aria-hidden="true">✳</span>
      <p className="summer-eyebrow">Uma temporada para recordar</p>
      <h2 id="summer-discovery-title">Indicações <em>de Verão</em></h2>
      <p>Um livro na bolsa, uma série para maratonar ou aquele filme que sempre dá vontade de rever.</p>
    </div>

    {!selected ? <>
      <div className="summer-discovery-categories" aria-label="Escolha sua indicação">
        {categories.map(({ key, action, hint, Icon }) => {
          const amount = recommendations.filter(item => item.kind === key).length;
          return <button type="button" className={`summer-discovery-category summer-discovery-category--${key}`}
            key={key} onClick={() => setSelected(key)} disabled={amount === 0}
            aria-label={action}>
            <span className="summer-discovery-category__disc"><Icon size={36} strokeWidth={1.25} aria-hidden="true" /></span>
            <strong>{action}</strong><small>{hint}</small>
            {amount > 0 && <span className="summer-discovery-category__count">{amount} sugestões</span>}
          </button>;
        })}
      </div>
      {ready && <p className="summer-discovery-progress">{completed} de {recommendations.length} histórias marcadas na sua lista</p>}
    </> : <div className="summer-discovery-list" aria-live="polite">
      <button type="button" className="summer-discovery-back" onClick={() => setSelected(null)}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar às indicações
      </button>
      <h3 className="summer-discovery-list__title">{selectedInfo?.label} para este verão</h3>
      {visible.length ? <div className="summer-discovery-grid">
        {visible.map((item, index) => {
          const done = progress[item.id]?.done ?? false;
          const rating = progress[item.id]?.rating ?? 0;
          const sources = Array.from(new Set([
            item.image_url,
            summerCoverFallbacks[item.id],
            summerCoverBackups[item.id],
          ].filter((src): src is string => typeof src === "string" && isSafePortalUrl(src))));
          const attempt = imageAttempts[item.id] ?? 0;
          const image = sources[attempt] ?? null;
          const link = isSafePortalUrl(item.url) ? item.url : null;
          const markLabel = item.kind === "livro" ? "Já li" : "Já assisti";
          return <article className={`summer-discovery-card summer-discovery-card--${index % 4}`} data-kind={item.kind} key={item.id}>
            <div className="summer-discovery-card__cover">
              {image ? <img src={image} alt={`Capa de ${item.title}`} loading="lazy" onError={() => setImageAttempts(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))}/>
                : <div className="summer-discovery-card__cover-fallback">
                  <span className="summer-discovery-card__cover-kicker">Hiraeth apresenta</span>
                  <span className="summer-discovery-card__cover-title">{item.title}</span>
                  <span className="summer-discovery-card__cover-sparkle" aria-hidden="true">✳</span>
                </div>}
              {done && <span className="summer-discovery-card__read" aria-label="Concluído"><Check size={16} /></span>}
            </div>
            <div className="summer-discovery-card__info">
              <span className="summer-discovery-card__eyebrow">{item.kind === "livro" ? "Leitura ao sol" : item.kind === "serie" ? "Série para maratonar" : "Sessão de cinema"}</span>
              <h4>{item.title}</h4>
              {item.creator && <p className="summer-discovery-card__credit">{item.creator}</p>}
              <p className="summer-discovery-card__description">{item.description}</p>
              {item.platform && <p className="summer-discovery-card__platform">Onde assistir: <strong>{item.platform}</strong></p>}
              {link && <a className="summer-discovery-card__link" href={link}
                target={link.startsWith("/") ? undefined : "_blank"}
                rel={link.startsWith("/") ? undefined : "noopener noreferrer"}>
                {item.platform ? `Abrir no ${item.platform}` : "Saiba mais"} <ArrowUpRight size={15} aria-hidden="true" />
              </a>}
              <label className="summer-discovery-card__check">
                <input type="checkbox" checked={done} onChange={event => update(item.id, { done: event.target.checked, rating: event.target.checked ? rating : 0 })} />
                <span>{markLabel}</span>
              </label>
              <div className="summer-discovery-card__rating" aria-label={`Avalie ${item.title} de um a cinco foguinhos`}>
                <span>Quantos foguinhos merece?</span>
                <div className="summer-discovery-card__fires">
                  {Array.from({ length: 5 }, (_, i) => <button type="button" key={i}
                    aria-label={`${i + 1} ${i === 0 ? "foguinho" : "foguinhos"} para ${item.title}`}
                    aria-pressed={rating === i + 1}
                    onClick={() => update(item.id, { done: true, rating: i + 1 })}
                    className={i < rating ? "summer-discovery-card__fire is-lit" : "summer-discovery-card__fire"}>🔥</button>)}
                </div>
              </div>
            </div>
          </article>;
        })}
      </div> : <p className="summer-discovery-progress">Novas indicações chegando.</p>}
      <p className="summer-discovery-storage-note">Seu checklist e seus foguinhos ficam salvos neste navegador.</p>
    </div>}
  </section>;
}
