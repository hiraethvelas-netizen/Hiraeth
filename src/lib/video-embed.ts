const VIMEO_VIDEO_ID_PATTERN = /^\d+$/;
const VIMEO_HASH_PATTERN = /^[a-zA-Z0-9]{8,}$/;

function getYouTubeVideoId(url: URL, hostname: string): string | null {
  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const markerIndex = segments.findIndex((segment) =>
    ["shorts", "embed", "live"].includes(segment),
  );

  return markerIndex >= 0 ? segments[markerIndex + 1] ?? null : null;
}

export function getVideoEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      const segments = url.pathname.split("/").filter(Boolean);
      const videoIdIndex = segments.findIndex((segment) =>
        VIMEO_VIDEO_ID_PATTERN.test(segment),
      );

      if (videoIdIndex === -1) return null;

      const videoId = segments[videoIdIndex];
      if (!videoId) return null;

      const pathHash = segments[videoIdIndex + 1];
      const queryHash = url.searchParams.get("h");
      const privacyHash =
        queryHash ||
        (pathHash && VIMEO_HASH_PATTERN.test(pathHash) ? pathHash : null);

      const embedUrl = new URL("https://player.vimeo.com/video/" + videoId);
      if (privacyHash) embedUrl.searchParams.set("h", privacyHash);

      return embedUrl.toString();
    }

    if (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      const videoId = getYouTubeVideoId(url, hostname);
      return videoId && /^[\w-]+$/.test(videoId)
        ? "https://www.youtube.com/embed/" + videoId
        : null;
    }

    return null;
  } catch {
    return null;
  }
}
