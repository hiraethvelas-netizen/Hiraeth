import { describe, expect, it } from "vitest";
import { getPostLoginDestination, getSafeInternalRedirect } from "@/lib/auth-routing";

describe("Hiraeth authentication routing", () => {
  it("defaults to the app home when no safe destination is supplied", () => {
    expect(getSafeInternalRedirect()).toBe("/inicio");
    expect(getSafeInternalRedirect("https://example.com")).toBe("/inicio");
    expect(getSafeInternalRedirect("//example.com/path")).toBe("/inicio");
  });

  it("preserves an internal destination and its query string after login", () => {
    expect(getSafeInternalRedirect("/loja?categoria=harry-potter")).toBe("/loja?categoria=harry-potter");
  });

  it("sends the administrator to the dashboard after a normal login", () => {
    expect(getPostLoginDestination("/inicio", true)).toBe("/admin");
  });

  it("returns customers to the requested app page", () => {
    expect(getPostLoginDestination("/inicio", false)).toBe("/inicio");
    expect(getPostLoginDestination("/loja?categoria=harry-potter", false)).toBe("/loja?categoria=harry-potter");
  });

  it("preserves an explicit catalog destination even for the administrator", () => {
    expect(getPostLoginDestination("/loja?categoria=harry-potter", true)).toBe("/loja?categoria=harry-potter");
  });
});
