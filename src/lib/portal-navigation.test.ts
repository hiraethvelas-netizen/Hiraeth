import { describe, expect, it } from "vitest";
import { clearPortalReturn, hasRecentPortalReturn, isReturningToPortal, markPortalReturn, portalHomeReturnUrl } from "@/lib/portal-navigation";

describe("Voltar ao portal NFC", () => {
  it("retorna à tela principal sem carregar a introdução", () => {
    expect(portalHomeReturnUrl("o-mundo-de-magia")).toBe("/portal/o-mundo-de-magia?inicio=1");
    expect(isReturningToPortal({ inicio: "1" })).toBe(true);
  });
  it("sinaliza o retorno pela própria aba e limpa após abrir o portal", () => {
    const slug = "o-mundo-de-magia";
    clearPortalReturn(slug);
    expect(hasRecentPortalReturn(slug)).toBe(false);
    markPortalReturn(slug);
    expect(hasRecentPortalReturn(slug)).toBe(true);
    clearPortalReturn(slug);
    expect(hasRecentPortalReturn(slug)).toBe(false);
  });

  it("preserva o vídeo para uma entrada NFC normal", () => {
    expect(isReturningToPortal({})).toBe(false);
    expect(isReturningToPortal({ inicio: "0" })).toBe(false);
    expect(portalHomeReturnUrl("portal especial")).toBe("/portal/portal%20especial?inicio=1");
  });
});
