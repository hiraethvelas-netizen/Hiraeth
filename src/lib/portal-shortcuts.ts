import { isSafePortalUrl } from "@/lib/portal-experience";

export type PortalShortcutKey = "playlist" | "inspirations" | "app";
export const PORTAL_SHORTCUTS: { key: PortalShortcutKey; label: string }[] = [
  { key: "playlist", label: "Playlist" },
  { key: "inspirations", label: "Inspirações" },
  { key: "app", label: "Aplicativo" },
];

function asRecord(theme: unknown): Record<string, unknown> {
  return theme && typeof theme === "object" && !Array.isArray(theme)
    ? theme as Record<string, unknown> : {};
}

export function portalShortcutImage(theme: unknown, key: PortalShortcutKey): string {
  const images = asRecord(theme)["shortcut_images"];
  const value = asRecord(images)[key];
  return isSafePortalUrl(value) ? value.trim() : "";
}

export function updatePortalShortcutImage(theme: unknown, key: PortalShortcutKey, url: string): Record<string, unknown> {
  const current = asRecord(theme);
  const images = asRecord(current["shortcut_images"]);
  return {
    ...current,
    shortcut_images: {
      ...images,
      [key]: isSafePortalUrl(url) ? url.trim() : "",
    },
  };
}
