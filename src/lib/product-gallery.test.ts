import { describe, expect, it } from "vitest";
import { galleryImageIndex, uniqueProductPhotos } from "./product-gallery";

describe("Product images shared with variations", () => {
  const gallery = [
    "/vela-frente.webp",
    "/vela-lateral.webp",
    "/vela-250g.webp",
  ];

  it("shows an existing variation photo without inserting any additional photo", () => {
    const original = [...gallery];
    const selected = galleryImageIndex(gallery, "/vela-250g.webp");
    expect(selected).toBe(2);
    expect(gallery).toEqual(original);
    expect(gallery).toHaveLength(3);
  });

  it("keeps the gallery stable for unknown or missing images", () => {
    expect(galleryImageIndex(gallery, "/imagem-antiga-externa.webp")).toBe(0);
    expect(galleryImageIndex(gallery, undefined)).toBe(0);
    expect(galleryImageIndex([], "/vela-250g.webp")).toBe(0);
  });

  it("deduplicates the gallery without removing the merchant's order", () => {
    expect(uniqueProductPhotos([gallery[0]!, gallery[1]!, gallery[0]!, gallery[2]!])).toEqual(gallery);
  });
});
