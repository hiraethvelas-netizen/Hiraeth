export const CROP_ASPECTS = { square: 1, portrait: 4 / 5, landscape: 16 / 9, photo: 4 / 3 } as const;
export type CropAspect = keyof typeof CROP_ASPECTS;

/** Keep the image covering the frame while limiting drag to the available image edges. */
export function getCropGeometry(
  imageWidth: number, imageHeight: number,
  frameWidth: number, frameHeight: number,
  zoom: number, rotation: number, requestedX: number, requestedY: number,
) {
  if ([imageWidth, imageHeight, frameWidth, frameHeight].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Dimensões inválidas para recortar a imagem.");
  }
  const turns = ((Math.round(rotation / 90) % 4) + 4) % 4;
  const rotatedWidth = turns % 2 ? imageHeight : imageWidth;
  const rotatedHeight = turns % 2 ? imageWidth : imageHeight;
  const scale = Math.max(frameWidth / rotatedWidth, frameHeight / rotatedHeight) * Math.max(1, zoom);
  const maxX = Math.max(0, (rotatedWidth * scale - frameWidth) / 2);
  const maxY = Math.max(0, (rotatedHeight * scale - frameHeight) / 2);
  return {
    scale,
    x: Math.max(-maxX, Math.min(maxX, requestedX)),
    y: Math.max(-maxY, Math.min(maxY, requestedY)),
    maxX,
    maxY,
  };
}
