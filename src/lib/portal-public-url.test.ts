import { describe, expect, it } from "vitest";
import { HIRAETH_PUBLIC_ORIGIN, permanentPortalUrl } from "./portal-public-url";

describe("Permanent portal NFC links", () => {
  it("generates the public destination, never a private preview host", () => {
    expect(HIRAETH_PUBLIC_ORIGIN).toBe("https://hiraeth-oficial.lovable.app");
    expect(permanentPortalUrl("o-mundo-de-magia"))
      .toBe("https://hiraeth-oficial.lovable.app/portal/o-mundo-de-magia");
  });
  it("keeps one destination for one slug across edits to other portal data", () => {
    const original = { slug: "o-mundo-de-magia", name: "O Mundo da Magia", intro_video_url: "/um.mp4" };
    const edited = { ...original, name: "Novo título", intro_video_url: "/outro.mp4" };
    expect(permanentPortalUrl(edited.slug)).toBe(permanentPortalUrl(original.slug));
  });
  it("refuses invalid or missing slugs instead of producing broken NFC tags", () => {
    expect(() => permanentPortalUrl("")).toThrow();
    expect(() => permanentPortalUrl("https://preview.example")).toThrow();
    expect(() => permanentPortalUrl("../segredo")).toThrow();
  });
});
