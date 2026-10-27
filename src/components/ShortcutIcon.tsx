import banner from "@/assets/banner-portal.png";
import fenix from "@/assets/fenix.png";
import forest from "@/assets/opening-forest.jpg";
import portal from "@/assets/opening-portal.jpg";

export const SHORTCUT_ICON_OPTIONS = [
  { value: "hiraeth", label: "H + fênix (Conheça a Hiraeth)" },
  { value: "candle", label: "Vela (Loja)" },
  { value: "heart", label: "Coração verde (Favoritos)" },
  { value: "book", label: "Livro aberto (Biblioteca)" },
  { value: "phoenix", label: "Fênix" },
  { value: "forest", label: "Floresta" },
  { value: "portal", label: "Portal" },
  { value: "banner", label: "Banner do portal" },
];

const svg = "h-1/2 w-1/2 text-primary";

/** Renders a shortcut image: uploaded URL, existing artwork, or a drawn icon. */
export function ShortcutIcon({ imageKey, title }: { imageKey: string; title: string }) {
  if (/^https?:\/\//i.test(imageKey)) return <img src={imageKey} alt={title} className="h-full w-full rounded-full object-cover" loading="lazy" />;
  const art: Record<string, string> = { phoenix: fenix, forest, portal, banner };
  if (art[imageKey]) return <img src={art[imageKey]} alt={title} className="h-full w-full rounded-full object-cover" loading="lazy" />;
  return (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-card" role="img" aria-label={title}>
      {imageKey === "hiraeth" && (
        <span className="relative flex items-center justify-center">
          <span className="font-display text-6xl italic text-primary">H</span>
          <img src={fenix} alt="" className="absolute -right-6 -top-3 h-10 w-10 object-contain" />
        </span>
      )}
      {imageKey === "candle" && (
        <svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <path d="M12 2c1.5 2 2 3.2 0 5-2-1.8-1.5-3 0-5Z" /><path d="M12 7v2" /><rect x="7" y="9" width="10" height="13" rx="1" /><path d="M7 13h10" />
        </svg>
      )}
      {imageKey === "heart" && (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-accent" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21Z" />
        </svg>
      )}
      {imageKey === "book" && (
        <svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <path d="M2 5c3-1 6-1 10 1.5C16 4 19 4 22 5v14c-3-1-6-1-10 1.5C8 18 5 18 2 19V5Z" /><path d="M12 6.5v14" />
        </svg>
      )}
    </span>
  );
}
