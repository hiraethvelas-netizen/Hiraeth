import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpenText, X } from "lucide-react";
import type { SummerRecipe } from "@/lib/summer-recipes";
import "./SummerRecipes.css";

type Recipe = SummerRecipe;

const photoFallbacks = [
  {
    primary: "https://imagem.band.com.br/18/f_272518.jpg",
    secondary: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=82",
  },
  {
    primary: "https://images.unsplash.com/photo-1512144981474-0003a89c0165?auto=format&fit=crop&w=900&q=82",
    secondary: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&q=82",
  },
  {
    primary: "https://www.elimparcial.com/resizer/v2/SGGACD2YYFDIPJIDYB6ZWO4TFQ.png?auth=e01bab99afcb8fc587e419205572706351d48566aaefce8d3491414fae7f2cc5&height=800&quality=70&smart=true&width=1200",
    secondary: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=900&q=82",
  },
  {
    primary: "https://aktivni.metropolitan.si/media/cache/upload/Photo/2020/10/15/profimedia-0357631591_biggalleryimage.jpg",
    secondary: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&q=82",
  },
] as const;

const icons = ["🍰", "🍋", "🥕", "🍐"];
const teasers = [
  "Uma pausa geladinha entre flores e sol.",
  "O frescor do nosso fim de tarde.",
  "Um copo cheio das cores do verão.",
  "Uma manhã leve, delicada e sem pressa.",
];

function safePhoto(value: string | undefined): string | null {
  if (!value) return null;
  const image = value.trim();
  if (image.startsWith("/") && !image.startsWith("//") && !image.includes("\\")) return image;
  try {return new URL(image).protocol === "https:" ? image : null;}
  catch {return null;}
}

export function SummerRecipePhoto({
  recipe, index, className,
}: { recipe: Recipe; index: number; className?: string }) {
  const defaultPhotos = photoFallbacks[index] ?? photoFallbacks[0];
  const custom = safePhoto(recipe.image_url);
  const startingPhoto = custom || defaultPhotos.primary;
  const [photo, setPhoto] = useState<string | null>(startingPhoto);

  useEffect(() => {setPhoto(startingPhoto);}, [startingPhoto]);

  function handleError() {
    if (photo !== defaultPhotos.primary && safePhoto(defaultPhotos.primary)) {
      setPhoto(defaultPhotos.primary);
    } else if (photo !== defaultPhotos.secondary) {
      setPhoto(defaultPhotos.secondary);
    } else {
      setPhoto(null);
    }
  }

  const displayTitle = recipe.title.split(/\s+[—–]\s+/)[0] ?? "Receita de verão";
  return <div className={`summer-recipe-photo ${className ?? ""}`}>
    <span className="summer-recipe-photo__placeholder" aria-hidden="true">{icons[index] ?? "🌞"}</span>
    {photo && <img src={photo} alt={`Foto ilustrativa: ${displayTitle}`}
      loading="lazy" onError={handleError}/>}
  </div>;
}

function RecipeModal({ recipe, index, onClose }: { recipe: Recipe; index: number; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab" && dialog.current) {
        const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
        if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {document.body.style.overflow = original;document.removeEventListener("keydown", onKeyDown);};
  }, [onClose]);

  const title = recipe.title.split(/\s+[—–]\s+/)[0] ?? "Receita de verão";
  const ingredients = (recipe.ingredients || "").split(";").map(x => x.trim()).filter(Boolean);
  if (ingredients.length) ingredients[0] = ingredients[0]?.replace(/^Para [^:]+:\s*/i, "") ?? ingredients[0] ?? "";
  const method = (recipe.method || "").trim();
  const steps = method.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim()).filter(Boolean) ?? [];
  const modal = <div className="summer-recipe-overlay" onClick={event => {if(event.target === event.currentTarget)onClose();}}>
    <div className="summer-recipe-dialog" ref={dialog} role="dialog" aria-modal="true"
      aria-labelledby="summer-recipe-modal-title" aria-describedby="summer-recipe-modal-subtitle" tabIndex={-1}>
      <button ref={closeButton} type="button" aria-label="Fechar receita" className="summer-recipe-close" onClick={onClose}><X size={22} aria-hidden="true" /></button>
      <SummerRecipePhoto recipe={recipe} index={index} className="summer-recipe-dialog__photo"/>
      <div className="summer-recipe-dialog__body">
        <p className="summer-recipe-dialog__eyebrow">Rituais de Verão · Hiraeth</p>
        <h3 id="summer-recipe-modal-title">{title}</h3>
        <p id="summer-recipe-modal-subtitle" className="summer-recipe-dialog__teaser">{teasers[index]}</p>
        <div className="summer-recipe-dialog__columns">
          <section aria-labelledby="summer-recipe-ingredients">
            <h4 id="summer-recipe-ingredients">Ingredientes</h4>
            <ul>{ingredients.map((ingredient, i) => <li key={i}>{ingredient}</li>)}</ul>
          </section>
          <section aria-labelledby="summer-recipe-steps">
            <h4 id="summer-recipe-steps">Passo a passo</h4>
            <ol>{steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
          </section>
        </div>
        <p className="summer-recipe-dialog__signature">Um pequeno ritual para guardar este verão.</p>
      </div>
    </div>
  </div>;
  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

export function SummerRecipes({ recipes }: { recipes: Recipe[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  function close() {
    setSelected(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return <section className="summer-drinks summer-content-section" id="receitas-de-verao" aria-labelledby="summer-drinks-title">
    <div className="summer-section-intro">
      <span className="summer-star" aria-hidden="true">✳</span>
      <p className="summer-eyebrow">Pequenos rituais</p>
      <h2 id="summer-drinks-title">Receitas <em>de Verão</em></h2>
      <p>Quatro convites para preparar algo gostoso e aproveitar o momento.</p>
    </div>
    <div className="summer-drinks-grid">
      {recipes.map((recipe, index) => {
        const visible = recipe.visible && recipe.title.trim();
        const title = visible ? recipe.title.split(/\s+[—–]\s+/)[0] : "Uma receita a descobrir";
        return <article className="summer-drink-card" key={index}>
          <div className="summer-drink-photo">
            <SummerRecipePhoto recipe={recipe} index={index} />
            <span className="summer-drink-number">{String(index+1).padStart(2,"0")}</span>
          </div>
          <div className="summer-drink-info">
            <h3>{title}</h3>
            {visible ? <>
              <p className="summer-recipe-teaser">{teasers[index]}</p>
              <button type="button" className="summer-recipe-open"
                aria-haspopup="dialog"
                onClick={event => {trigger.current = event.currentTarget;setSelected(index);}}>
                Ver receita completa <ArrowUpRight size={16} aria-hidden="true"/>
              </button>
            </> : <p className="summer-muted">Em preparação</p>}
          </div>
        </article>;
      })}
    </div>
    {selected !== null && recipes[selected] && <RecipeModal recipe={recipes[selected]} index={selected} onClose={close}/>}
  </section>;
}
