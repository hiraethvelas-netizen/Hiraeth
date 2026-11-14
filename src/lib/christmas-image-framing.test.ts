import { describe, expect, it } from "vitest";
import { christmasCandleFrame } from "./christmas-image-framing";

const W = 120, H = 150;
function pixels(rect: [number, number, number, number], transparent: boolean) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const index = (y * W + x) * 4;
    const candle = x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3];
    const color = candle ? [155, 15, 12] : [247, 239, 218];
    rgba[index] = color[0];
    rgba[index + 1] = color[1];
    rgba[index + 2] = color[2];
    rgba[index + 3] = transparent && !candle ? 0 : 255;
  }
  return rgba;
}

describe("Christmas candle size normalization", () => {
  it.each([false, true])("equalizes the visible height of two candle uploads (transparent=%s)", transparent => {
    const large = christmasCandleFrame(pixels([25, 15, 95, 133], transparent), W, H);
    const small = christmasCandleFrame(pixels([35, 35, 85, 115], transparent), W, H);
    expect(small.scale).toBeGreaterThan(large.scale);
    const visibleLarge = (133 - 15 + 1) * large.scale;
    const visibleSmall = (115 - 35 + 1) * small.scale;
    expect(Math.abs(visibleLarge - visibleSmall)).toBeLessThan(4);
  });
  it("does not alter a blank or unrecognizable upload", () => {
    expect(christmasCandleFrame(new Uint8ClampedArray(W * H * 4), W, H).scale).toBe(1);
    expect(christmasCandleFrame(new Uint8ClampedArray(4), W, H).scale).toBe(1);
  });
  it("never scales a large candle so much that its label or bow is clipped", () => {
    const nearlyFull = christmasCandleFrame(pixels([4, 6, 115, 143], true), W, H);
    expect(nearlyFull.scale).toBeLessThanOrEqual(1);
    expect(nearlyFull.scale).toBeGreaterThan(0.8);
  });
});
