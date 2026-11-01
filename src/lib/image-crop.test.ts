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
});
