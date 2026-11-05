import { describe, expect, it } from "vitest";
import { getVideoEmbedUrl } from "./video-embed";

describe("getVideoEmbedUrl", () => {
  it("converts a public Vimeo URL", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("preserves the privacy hash in an unlisted Vimeo URL query", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/123456789?h=913062c8ff")).toBe(
      "https://player.vimeo.com/video/123456789?h=913062c8ff",
    );
  });

  it("converts the privacy hash in an unlisted Vimeo path", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/123456789/913062c8ff")).toBe(
      "https://player.vimeo.com/video/123456789?h=913062c8ff",
    );
  });

  it("preserves a privacy hash from a Vimeo player URL", () => {
    expect(
      getVideoEmbedUrl("https://player.vimeo.com/video/123456789?h=913062c8ff"),
    ).toBe("https://player.vimeo.com/video/123456789?h=913062c8ff");
  });

  it("continues to support YouTube Shorts and watch URLs", () => {
    expect(getVideoEmbedUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
    expect(getVideoEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("returns null for unsupported or malformed URLs", () => {
    expect(getVideoEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(getVideoEmbedUrl("not a URL")).toBeNull();
  });
});
