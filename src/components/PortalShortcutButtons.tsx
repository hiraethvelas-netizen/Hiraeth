import { BookOpenText, Headphones, Smartphone } from "lucide-react";
import { PORTAL_SHORTCUTS, portalShortcutImage, type PortalShortcutKey } from "@/lib/portal-shortcuts";

type Props = {
  theme: unknown;
  spotifyUrl: string | null;
  spotifyVisible: boolean | null;
  inspirationUrl: string;
  appUrl: string;
};

const icons = {
  playlist: Headphones,
  inspirations: BookOpenText,
  app: Smartphone,
} as const;

export function PortalShortcutButtons({ theme, spotifyUrl, spotifyVisible, inspirationUrl, appUrl }: Props) {
  const links: Record<PortalShortcutKey, string | null> = {
    playlist: spotifyVisible && spotifyUrl ? spotifyUrl : null,
    inspirations: inspirationUrl,
    app: appUrl,
  };

  return <div className="portal-shortcuts relative z-10 mx-auto grid max-w-[590px] grid-cols-3 items-start gap-3 sm:gap-7"
    aria-label="Atalhos do Mundo da Magia">
    {PORTAL_SHORTCUTS.map(({ key, label }) => {
      const Icon = icons[key];
      const image = portalShortcutImage(theme, key);
      const href = links[key];
      const ariaLabel = key === "inspirations" ? "Conheça as inspirações"
        : key === "playlist" ? "Ouvir playlist da coleção no Spotify" : "Abra o aplicativo Hiraeth";
      const circle = <span className={"portal-shortcut__circle portal-shortcut__circle--" + key}>
        {image ? <img src={image} alt="" className="portal-shortcut__image" loading="lazy" />
          : <Icon size={35} strokeWidth={1.3} aria-hidden="true" className="portal-shortcut__fallback" />}
      </span>;
      const caption = <span className="portal-shortcut__label">{label}</span>;
      if (!href) return <div key={key} className="portal-shortcut portal-shortcut--disabled"
        aria-label={label + " em preparação"}>
        {circle}{caption}
      </div>;
      return <a key={key} href={href} aria-label={ariaLabel}
        {...(key !== "inspirations" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="portal-shortcut group">
        {circle}{caption}
      </a>;
    })}
  </div>;
}
