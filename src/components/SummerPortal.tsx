import { ArrowRight, ArrowUpRight, BookOpenText, BookOpen, Clapperboard, Headphones, Smartphone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { spotifyPlaylistUrl } from "@/lib/portal-experience";
import { summerRecipesFromTheme } from "@/lib/summer-recipes";
import hiraethWordmark from "@/assets/hiraeth-wordmark.svg";
import { SummerPortalCatalog } from "@/components/SummerPortalCatalog";
import "./SummerPortal.css";

type Portal = Tables<"portals">;
type ThemeRecord = Record<string, unknown>;
type Recipe = { title?: string; ingredients?: string; method?: string; image_url?: string; visible?: boolean };
type Recommendation = { kind?: "livro" | "serie"; title?: string; description?: string; image_url?: string; url?: string; visible?: boolean };
type SummerSettings = { show_catalog?: boolean; recipes?: Recipe[]; recommendations?: Recommendation[] };

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
    recommendations: Array.isArray(raw["recommendations"]) ? raw["recommendations"].filter(record) as Recommendation[] : [],
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

const recipeIcons = ["🥥", "🍋", "🥕", "🍐"];
const recommendationKinds = ["livro", "serie", "livro", "serie"] as const;

export function SummerPortal({ portal }: { portal: Portal }) {
  const settings = summerSettings(portal.theme);
  const spotifyUrl = portal.spotify_visible ? spotifyPlaylistUrl(portal.spotify_playlist_url) : null;
  const recipes: Recipe[] = Array.from({ length: 4 }, (_, i) => settings.recipes?.[i] ?? {});
  const recommendations: Recommendation[] = Array.from({ length: 4 }, (_, i) => settings.recommendations?.[i] ?? {});
  const catalog = portal.store_category_url && /^\/loja\?categoria=[a-z0-9-]+(?:&|$)/.test(portal.store_category_url)
    ? portal.store_category_url : null;

  return <div className="summer-portal">
    <section className="summer-hero" aria-labelledby="summer-title">
      <div className="summer-water" aria-hidden="true" />
      <div className="summer-hero-stripe" aria-hidden="true" />
      <span className="summer-hero-hibiscus" aria-hidden="true">✿</span>
      <span className="summer-hero-lemon" aria-hidden="true">◒</span>
      <div className="summer-hero-inner">
        <img src={hiraethWordmark} alt="Hiraeth" className="summer-brand" />
        <div className="summer-top-ornament"><SummerStar light /></div>
        <p className="summer-kicker">Sol, memórias e novas histórias</p>
        <h1 id="summer-title">Portal <em>de Verão</em></h1>
        <p className="summer-hero-copy">Algumas histórias têm cheiro de férias. Entre, escolha seu caminho e deixe o verão acontecer.</p>
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

      <section className="summer-memoir" aria-labelledby="summer-memoir-title">
        <div className="summer-memoir-copy">
          <p className="summer-eyebrow">Um verão para guardar</p>
          <h2 id="summer-memoir-title">Colecione <em>sensações.</em></h2>
          <p>O sol no rosto, o som das ondas, uma bebida gelada e aquele livro que parece ter sido escrito para as férias.</p>
          <p>Na Hiraeth, cada aroma guarda um lugar ao qual a memória sempre quer voltar.</p>
        </div>
        <div className="summer-stamp-set" aria-label="Elementos da coleção de verão">
          <span title="Flores de Janeiro">🌺</span><span title="Sol na Pele">🍍</span><span title="Caipirinha">🍋</span>
          <span title="Sombra Fresca">🌿</span><span title="Águas de Cristal">🍐</span><span title="Brisa do Mar">🐚</span>
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
            const img = published ? safeImage(item.image_url) : null;
            const [recipeTitle, candleName] = published
              ? (item.title ?? "").split(/\\s+[—–]\\s+/, 2)
              : ["Uma receita a descobrir", ""];
            return <article className="summer-drink-card" key={i}>
              <div className={"summer-drink-photo summer-drink-photo--" + (i + 1)}>
                {img ? <img src={img} alt="" loading="lazy" /> : <span className="summer-drink-symbol" aria-hidden="true">{recipeIcons[i]}</span>}
                <span className="summer-drink-number">0{i + 1}</span>
              </div>
              <div className="summer-drink-info">
                <h3>{recipeTitle}</h3>
                {candleName && <p className="summer-recipe-inspiration">Inspirada na vela {candleName}</p>}
                {published ? <>
                  {item.ingredients && <p><strong>Ingredientes:</strong> {item.ingredients}</p>}
                  {item.method && <details><summary>Como preparar</summary><p>{item.method}</p></details>}
                </> : <p className="summer-muted">Em preparação</p>}
              </div>
            </article>;
          })}
        </div>
      </section>

      <section className="summer-picks summer-content-section" id="indicacoes-de-verao" aria-labelledby="summer-picks-title">
        <div className="summer-section-intro"><SummerStar /><p className="summer-eyebrow">Entre um mergulho e outro</p>
          <h2 id="summer-picks-title">Indicações <em>de Verão</em></h2>
          <p>Livros para levar na bolsa de praia e séries para as tardes em que tudo o que queremos é ficar por perto.</p>
        </div>
        <div className="summer-picks-grid">
          {recommendations.map((item, i) => {
            const published = item.visible === true && Boolean(item.title?.trim());
            const type = item.kind === "livro" || item.kind === "serie" ? item.kind : recommendationKinds[i];
            const img = published ? safeImage(item.image_url) : null;
            const link = published ? safeImage(item.url) : null;
            return <article className="summer-pick-card" key={i}>
              <div className={"summer-pick-illustration summer-pick-illustration--" + (i + 1)}>
                {img ? <img src={img} alt="" loading="lazy" /> : type === "livro" ? <BookOpen size={45} strokeWidth={1.2} aria-hidden="true" /> : <Clapperboard size={45} strokeWidth={1.2} aria-hidden="true" />}
              </div>
              <div className="summer-pick-info">
                <span className="summer-pick-type">{type === "livro" ? "Leitura ao sol" : "Série de verão"}</span>
                <h3>{published ? item.title : "Uma história para descobrir"}</h3>
                <p>{published ? item.description : "Curadoria em preparação"}</p>
                {link && <a className="summer-pick-link" href={link} target={link.startsWith("/") ? undefined : "_blank"} rel={link.startsWith("/") ? undefined : "noopener noreferrer"}>Saiba mais <ArrowUpRight size={15} /></a>}
              </div>
            </article>;
          })}
        </div>
      </section>

      {settings.show_catalog && <SummerPortalCatalog portalId={portal.id} catalogUrl={catalog} />}
    </main>
    <footer className="summer-footer"><SummerStar/><p>Hiraeth — Onde a Chama Acesa te Espera.</p><p>Uma estação. Infinitas memórias.</p></footer>
  </div>;
}