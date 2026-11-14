export type CandleFrame = {
  scale: number;
};

/** Identify the actual product silhouette, rather than treating transparent/empty
 * margins in two different uploads as part of the candle's visible size.
 * Deliberately limits scaling to avoid clipping lids, bows or original labels.
 */
export function christmasCandleFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): CandleFrame {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || data.length < width * height * 4) {
    return { scale: 1 };
  }
  const cornerPixels = [
    0, width - 1, (height - 1) * width, height * width - 1,
  ].map(index => {
    const i = index * 4;
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 0];
  });
  const transparent = cornerPixels.filter(pixel => pixel[3] < 120).length >= 2;
  const background = [0, 1, 2].map(channel =>
    cornerPixels.reduce((sum, pixel) => sum + pixel[channel], 0) / cornerPixels.length,
  );
  let minX = width; let maxX = -1; let minY = height; let maxY = -1;
  const column = new Uint32Array(width);
  const row = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] ?? 0;
      const foreground = transparent
        ? alpha >= 65
        : alpha >= 65 && Math.hypot(
          (data[i] ?? 0) - background[0],
          (data[i + 1] ?? 0) - background[1],
          (data[i + 2] ?? 0) - background[2],
        ) > 90;
      if (!foreground) continue;
      column[x]++;
      row[y]++;
    }
  }

  // Exclude single-pixel edge artifacts and faint shadows.
  const minPixelsPerColumn = Math.max(1, Math.ceil(height * .015));
  const minPixelsPerRow = Math.max(1, Math.ceil(width * .015));
  for (let x = 0; x < width; x++) {
    if (column[x] >= minPixelsPerColumn) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  for (let y = 0; y < height; y++) {
    if (row[y] >= minPixelsPerRow) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return { scale: 1 };
  const widthFraction = (maxX - minX + 1) / width;
  const heightFraction = (maxY - minY + 1) / height;
  if (widthFraction < .2 || heightFraction < .2) return { scale: 1 };

  const fitWidth = .92 / widthFraction;
  const fitHeight = .89 / heightFraction;
  return { scale: Math.max(.82, Math.min(1.36, fitWidth, fitHeight)) };
}
