export type PortalGalleryItem = {
  id: string;
  title: string;
  image_url: string;
  description: string;
  url: string;
};

type PortalTheme = Record<string, unknown>;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function isSafePortalUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function spotifyPlaylistUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;
    const match = /^\/playlist\/([a-zA-Z0-9]+)\/?$/.exec(url.pathname);
    return match ? `https://open.spotify.com/playlist/${match[1]}` : null;
  } catch {
    return null;
  }
}

export function galleryDraftFromTheme(theme: unknown): PortalGalleryItem[] {
  if (!record(theme) || !Array.isArray(theme["carousel_items"])) return [];
  return theme["carousel_items"].flatMap((value: unknown, index: number) => {
    if (!record(value)) return [];
    const getText = (key:string) => typeof value[key] === "string" ? value[key] as string : "";
    return [{
      id:getText("id") || `photo-${index}`,
      title:getText("title"),
      image_url:getText("image_url"),
      description:getText("description"),
      url:getText("url"),
    }];
  });
}

export function carouselFromTheme(theme: unknown): PortalGalleryItem[] {
  if (!record(theme) || !Array.isArray(theme["carousel_items"])) return [];
  return theme["carousel_items"].flatMap((value: unknown, index: number) => {
    if (!record(value)) return [];
    const image_url = typeof value["image_url"] === "string" ? value["image_url"].trim() : "";
    const text = (key: string, length = 120) =>
      typeof value[key] === "string" ? (value[key] as string).trim().slice(0, length) : "";
    return [{
      id: text("id", 80) || `photo-${index}`,
      title: text("title") || `Foto ${index + 1}`,
      image_url: isSafePortalUrl(image_url) ? image_url : "",
      description: text("description", 250),
      url: isSafePortalUrl(value["url"]) ? (value["url"] as string).trim() : "",
    }];
  });
}

export function updatePortalGallery(theme: unknown, items: PortalGalleryItem[]): PortalTheme {
  return {
    ...(record(theme) ? theme : {}),
    carousel_items: items.map(({ id,title,image_url,description,url }) => ({
      id,title,image_url,description,url,
    })),
  };
}

export const isMagicWorld = (slug: string): boolean => slug === "o-mundo-de-magia";
export const magicWorldTitle = (slug: string, fallback: string): string =>
  isMagicWorld(slug) ? "O Mundo da Magia" : fallback;

export function portalCatalogDestination(slug: string, configured: string | null): string {
  // Keep the reader inside the Hiraeth store, not on an injected external URL.
  if (isMagicWorld(slug)) return "/loja?categoria=harry-potter";
  return configured && /^\/loja(?:\?|$)/.test(configured) ? configured : "/loja";
}
