import { describe, expect, it } from "vitest";
import { CROP_ASPECTS, getCropGeometry } from "./image-crop";

describe("Home image crop calculations", () => {
  it("fills the square frame without stretching the photo", () => {
    const frame = getCropGeometry(1600, 900, 900, 900, 1, 0, 0, 0);
    expect(frame.scale).toBe(1);
    expect(frame.maxX).toBe(350);
    expect(frame.maxY).toBe(0);
  });

  it("keeps dragged images from leaving empty space in the crop", () => {
    const frame = getCropGeometry(1600, 900, 900, 900, 1.5, 0, 9999, -9999);
    expect(frame.x).toBe(frame.maxX);
    expect(frame.y).toBe(-frame.maxY);
  });

  it("accounts for photos rotated by 90 degrees", () => {
    const frame = getCropGeometry(1200, 800, 900, 900, 1, 90, 0, 0);
    expect(frame.scale).toBe(1.125);
    expect(frame.maxX).toBe(0);
    expect(frame.maxY).toBe(225);
  });

  it("supports rectangular homepage banners", () => {
    const frame = getCropGeometry(1200, 800, 900, Math.round(900 / CROP_ASPECTS.landscape), 1, 0, 0, 0);
    expect(frame.maxY).toBeGreaterThan(0);
    expect(frame.maxX).toBe(0);
  });

  it("rejects broken dimensions instead of producing invalid canvas coordinates", () => {
    expect(() => getCropGeometry(0, 900, 900, 900, 1, 0, 0, 0)).toThrow("Dimensões inválidas");
  });

  it("keeps the existing covering behavior when no optional fit is supplied", () => {
    const original = getCropGeometry(96, 180, 1000, 1250, 1, 0, 0, 0);
    expect(original).toEqual(getCropGeometry(96, 180, 1000, 1250, 1, 0, 0, 0, "cover"));
    expect(96 * original.scale).toBe(1000);
    expect(180 * original.scale).toBe(1875);
  });

  it.each([96, 93])("can show the entire narrow %spx candle inside a portrait frame", width => {
    const frame = getCropGeometry(width, 180, 1000, 1250, 1, 0, 0, 0, "contain");
    expect(180 * frame.scale).toBe(1250);
    expect(width * frame.scale).toBeLessThan(1000);
    expect(frame.x).toBe(0);
    expect(frame.y).toBe(0);
  });

  it("keeps the complete candle inside the frame after a quarter turn", () => {
    const frame = getCropGeometry(96, 180, 1000, 1250, 1, 90, 0, 0, "contain");
    expect(180 * frame.scale).toBe(1000);
    expect(96 * frame.scale).toBeLessThan(1250);
    expect(frame.maxX).toBe(0);
    expect(frame.maxY).toBe(0);
  });

  it("allows zoom and bounded movement after starting with the whole candle", () => {
    const base = getCropGeometry(96, 180, 1000, 1250, 1, 0, 0, 0, "contain");
    const zoomed = getCropGeometry(96, 180, 1000, 1250, 2, 0, 9999, -9999, "contain");
    expect(zoomed.scale).toBe(base.scale * 2);
    expect(zoomed.maxX).toBeGreaterThan(0);
    expect(zoomed.maxY).toBeGreaterThan(0);
    expect(zoomed.x).toBe(zoomed.maxX);
    expect(zoomed.y).toBe(-zoomed.maxY);
  });
});
