import { describe, expect, it } from "vitest";
import { isReturningToPortal, portalHomeReturnUrl } from "@/lib/portal-navigation";

describe("Voltar ao portal NFC", () => {
  it("retorna à tela principal sem carregar a introdução", () => {
    expect(portalHomeReturnUrl("o-mundo-de-magia")).toBe("/portal/o-mundo-de-magia?inicio=1");
    expect(isReturningToPortal({ inicio: "1" })).toBe(true);
  });
  it("preserva o vídeo para uma entrada NFC normal", () => {
    expect(isReturningToPortal({})).toBe(false);
    expect(isReturningToPortal({ inicio: "0" })).toBe(false);
    expect(portalHomeReturnUrl("portal especial")).toBe("/portal/portal%20especial?inicio=1");
  });
});
