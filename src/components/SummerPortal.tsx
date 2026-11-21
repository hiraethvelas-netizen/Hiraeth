import { ArrowRight, BookOpenText, Headphones, Smartphone, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { spotifyPlaylistUrl } from "@/lib/portal-experience";
import { summerRecipesFromTheme } from "@/lib/summer-recipes";
import hiraethWordmark from "@/assets/hiraeth-wordmark.svg";
import { SummerPortalCatalog } from "@/components/SummerPortalCatalog";
import { SummerRecommendations } from "@/components/SummerRecommendations";
import "./SummerPortal.css";

type Portal = Tables<"portals">;
type ThemeRecord = Record<string, unknown>;
type Recipe = { title?: string; ingredients?: string; method?: string; image_url?: string; visible?: boolean };
type SummerSettings = { show_catalog?: boolean; recipes?: Recipe[] };

function record(value: unknown): value is ThemeRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function summerSettings(theme: unknown): SummerSettings {
  if (!record(theme)) return {};
  const source = theme["summer"];
  if (!record(source)) return {};
  const raw = source;
  return {
    show_catalog: raw["show_catalog"] === true,
    recipes: summerRecipesFromTheme(raw),
  };
}

function safeImage(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const value = url.trim();
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try { const u = new URL(value); return u.protocol === "https:" ? value : null; }
  catch { return null; }
}

function SummerStar({ light = false }: { light?: boolean }) {
  return <span className={light ? "summer-star summer-star--light" : "summer-star"} aria-hidden="true">✳</span>;
}

const recipeIcons = ["🍰", "🍋", "🥕", "🍐"];
// Fotografias editoriais de referência; podem ser substituídas no painel admin.
const recipePhotoFallbacks = [
  "https://imagem.band.com.br/18/f_272518.jpg",
  "https://estranho.com/inventos/img/caipirinha.webp",
  "https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2025/6/10/avatar-17495238021021703714519-389-0-1639-2000-crop-1749523817276880260977.png",
  "https://kitchenaid.com.au/cdn/shop/articles/15bc6c058e38453750f01a44d603e9b6_1200x1200.jpg?v=1565774799",
] as const;
const recipeTeasers = ["Uma pausa geladinha entre flores e sol.", "O frescor do nosso fim de tarde.", "Um copo cheio das cores do verão.", "Uma manhã leve, delicada e sem pressa."];

const GOLDEN_HOUR_STORAGE_KEY = "hiraeth-portal-verao-golden-hour";

export function SummerPortal({ portal }: { portal: Portal }) {
  const [goldenHour, setGoldenHour] = useState(false);
  useEffect(() => {
    try { setGoldenHour(window.localStorage.getItem(GOLDEN_HOUR_STORAGE_KEY) === "on"); }
    catch { /* Keep default daylight mode when browser storage is unavailable. */ }
  }, []);
  function toggleGoldenHour() {
    const next = !goldenHour;
    setGoldenHour(next);
    try { window.localStorage.setItem(GOLDEN_HOUR_STORAGE_KEY, next ? "on" : "off"); }
    catch { /* The toggle still works in private browsing. */ }
  }
  const settings = summerSettings(portal.theme);
  const spotifyUrl = portal.spotify_visible ? spotifyPlaylistUrl(portal.spotify_playlist_url) : null;
  const recipes: Recipe[] = Array.from({ length: 4 }, (_, i) => settings.recipes?.[i] ?? {});
  const catalog = portal.store_category_url && /^\/loja\?categoria=[a-z0-9-]+(?:&|$)/.test(portal.store_category_url)
    ? portal.store_category_url : null;

  return <div className={goldenHour ? "summer-portal summer-portal--golden" : "summer-portal"} data-summer-mode={goldenHour ? "golden-hour" : "daylight"}>
    <section className="summer-hero" aria-labelledby="summer-title">
      <div className="summer-water" aria-hidden="true" />
      <div className="summer-sunset-glow" aria-hidden="true" />
      <div className="summer-hero-stripe" aria-hidden="true" />
      <div className="summer-hero-hibiscus summer-hero-photo" aria-hidden="true">
        <img src="https://images.unsplash.com/photo-1554569258-670a25302596?w=640&q=76" alt="" loading="lazy" />
      </div>
      <div className="summer-hero-parasol summer-hero-photo" aria-hidden="true">
        <img src="https://static.wixstatic.com/media/a98afb_48b907925d2a4b0287373ddd0eaefb67~mv2.jpg/v1/fill/w_1000%2Ch_800%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01/a98afb_48b907925d2a4b0287373ddd0eaefb67~mv2.jpg" alt="" loading="lazy" />
      </div>
      <span className="summer-hero-lemon" aria-hidden="true">✳</span>
      <div className="summer-hero-inner">
        <img src={hiraethWordmark} alt="Hiraeth" className="summer-brand" />
        <div className="summer-top-ornament"><SummerStar light /></div>
        <p className="summer-kicker">Sol, memórias e novas histórias</p>
        <h1 id="summer-title">Portal <em>de Verão</em></h1>
        <p className="summer-hero-copy">Algumas histórias têm cheiro de férias. Entre, escolha seu caminho e deixe o verão acontecer.</p>
        <button type="button" className="summer-golden-toggle" onClick={toggleGoldenHour}
          aria-pressed={goldenHour} aria-label={goldenHour ? "Desligar o modo Golden Hour e voltar ao verão azul" : "Ativar Golden Hour: pôr do sol dourado"}>
          <span className="summer-golden-toggle__sun" aria-hidden="true"><Sun size={22} strokeWidth={1.65} /></span>
          <span className="summer-golden-toggle__label">Golden Hour</span>
 
        </button>
        <div className="summer-hero-scroll"><span>Descubra o que há neste portal</span><ArrowRight size={17} aria-hidden="true" /></div>
      </div>
      <div className="summer-hero-edge" aria-hidden="true" />
    </section>

    <main>
      <section className="summer-shortcuts" aria-label="Portas para o universo de verão">
        <div className="summer-section-intro">
          <SummerStar />
          <p className="summer-eyebrow">Portas para este universo</p>
          <h2>Para onde vamos <em>hoje?</em></h2>
        </div>
        <div className="summer-round-grid">
          {spotifyUrl ? <a className="summer-round-link" href={spotifyUrl} target="_blank" rel="noopener noreferrer">
            <span className="summer-round-icon summer-round-icon--music"><Headphones size={30} strokeWidth={1.5}/></span><strong>Playlist</strong><small>Ouça no Spotify</small>
          </a> : <div className="summer-round-link summer-round-link--disabled" aria-label="Playlist de verão em preparação">
            <span className="summer-round-icon summer-round-icon--music"><Headphones size={30} strokeWidth={1.5}/></span><strong>Playlist</strong><small>Em preparação</small>
          </div>}
          <a className="summer-round-link" href="/portal/verao/inspiracoes">
            <span className="summer-round-icon summer-round-icon--story"><BookOpenText size={30} strokeWidth={1.5}/></span><strong>Inspirações</strong><small>Por trás das chamas</small>
          </a>
          <a className="summer-round-link" href="/inicio">
            <span className="summer-round-icon summer-round-icon--app"><Smartphone size={30} strokeWidth={1.5}/></span><strong>Aplicativo</strong><small>Acesse a Hiraeth</small>
          </a>
        </div>
      </section>

      <section className="summer-drinks summer-content-section" id="receitas-de-verao" aria-labelledby="summer-drinks-title">
        <div className="summer-section-intro"><SummerStar /><p className="summer-eyebrow">Pequenos rituais</p>
          <h2 id="summer-drinks-title">Receitas <em>de Verão</em></h2>
          <p>Quatro convites para desacelerar, preparar algo refrescante e aproveitar o momento.</p>
        </div>
        <div className="summer-drinks-grid">
          {recipes.map((item, i) => {
            const published = item.visible === true && Boolean(item.title?.trim());
            const img = published ? safeImage(item.image_url) ?? recipePhotoFallbacks[i] : null;
            const ingredients = item.ingredients?.split(";").map(value => value.trim()).filter(Boolean) ?? [];
            const steps = item.method?.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).map(value => value.trim()).filter(Boolean) ?? [];
            const [recipeTitle] = published
              ? (item.title ?? "").split(/\s+[—–]\s+/, 2)
              : ["Uma receita a descobrir", ""];
            return <article className="summer-drink-card" key={i}>
              <div className={"summer-drink-photo summer-drink-photo--" + (i + 1)}>
                <span className="summer-drink-symbol" aria-hidden="true">{recipeIcons[i]}</span>
                {img && <img src={img} alt={`Fotografia ilustrativa de ${recipeTitle}`} loading="lazy" onError={event => {event.currentTarget.style.display = "none";}} />}
                <span className="summer-drink-number">0{i + 1}</span>
              </div>
              <div className="summer-drink-info">
                <h3>{recipeTitle}</h3>
                {published ? <>
                  <p className="summer-recipe-teaser">{recipeTeasers[i]}</p>
                  <details className="summer-recipe-details"><summary>Ver receita</summary>
                    {ingredients.length > 0 && <div className="summer-recipe-section">
                      <h4>Ingredientes</h4>
                      <ul>{ingredients.map((part, index) => <li key={index}>{part.replace(/^Para \d+ (taça|copo|torradas?|pedaços?):\s*/i, "")}</li>)}</ul>
                    </div>}
                    {steps.length > 0 && <div className="summer-recipe-section">
                      <h4>Passo a passo</h4>
                      <ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
                    </div>}
                  </details>
                </> : <p className="summer-muted">Em preparação</p>}
              </div>
            </article>;
          })}
        </div>
      </section>

      <SummerRecommendations theme={portal.theme} />

      {settings.show_catalog && <SummerPortalCatalog portalId={portal.id} catalogUrl={catalog} />}
    </main>
    <footer className="summer-footer"><SummerStar/><p>Hiraeth — Onde a Chama Acesa te Espera.</p><p>Uma estação. Infinitas memórias.</p></footer>
  </div>;
}