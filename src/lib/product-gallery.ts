/**
 * Product gallery images are the single source of truth for variant photos.
 * Selecting a variant only navigates to an image already present in the gallery:
 * it never inserts an extra image or duplicates the photo.
 */
export function galleryImageIndex(images: string[], variantImage?: string | null): number {
  if (!images.length) return 0;
  if (!variantImage) return 0;
  const index = images.indexOf(variantImage);
  return index >= 0 ? index : 0;
}

export function uniqueProductPhotos(images: string[] | null | undefined): string[] {
  return [...new Set((images ?? []).filter(Boolean))];
}
