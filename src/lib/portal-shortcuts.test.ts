import { describe, expect, it } from "vitest";
import { PORTAL_SHORTCUTS, portalShortcutImage, updatePortalShortcutImage } from "@/lib/portal-shortcuts";

describe("Imagens editáveis dos atalhos NFC", () => {
  it("mantém os três atalhos e preserva configurações do portal ao alterar fotos", () => {
    expect(PORTAL_SHORTCUTS.map(item => item.key)).toEqual(["playlist", "inspirations", "app"]);
    const theme = { palette: { background: "#111923" }, carousel_items: [{ id: "natal" }],
      shortcut_images: { playlist: "/playlist.webp" } };
    const updated = updatePortalShortcutImage(theme, "inspirations", "/livros.webp");
    expect(updated["palette"]).toEqual(theme.palette);
    expect(updated["carousel_items"]).toEqual(theme.carousel_items);
    expect(portalShortcutImage(updated, "playlist")).toBe("/playlist.webp");
    expect(portalShortcutImage(updated, "inspirations")).toBe("/livros.webp");
  });

  it("ignora URLs perigosas e pode retirar uma imagem sem afetar as outras", () => {
    const theme = updatePortalShortcutImage({}, "app", "javascript:alert(1)");
    expect(portalShortcutImage(theme, "app")).toBe("");
    const current = { shortcut_images: { app: "/app.webp", playlist: "/vinil.webp" } };
    const updated = updatePortalShortcutImage(current, "app", "");
    expect(portalShortcutImage(updated, "app")).toBe("");
    expect(portalShortcutImage(updated, "playlist")).toBe("/vinil.webp");
  });
});
