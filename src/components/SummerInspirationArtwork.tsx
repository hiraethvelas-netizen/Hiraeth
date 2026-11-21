import { useEffect, useState, type CSSProperties } from "react";
import { SummerSymbol, type SummerSymbolKind } from "@/components/SummerEditorialIcons";
import type { SummerInspiration } from "@/lib/summer-inspirations";
import { isSafePortalUrl } from "@/lib/portal-experience";

const symbolById: Record<string, SummerSymbolKind> = {
  "flores-de-janeiro": "flores",
  "sol-na-pele": "sol",
  "caipirinha": "caipirinha",
  "sombra-fresca": "sombra",
  "aguas-de-cristal": "aguas",
  "brisa-do-mar": "brisa",
};

/** Uses the original full-size upload and a CSS-only crop; never re-encodes image data. */
export function SummerInspirationArtwork({
  item,
  className,
  showFallback = true,
}: {
  item: SummerInspiration;
  className?: string;
  showFallback?: boolean;
}) {
  const url = isSafePortalUrl(item.image_url) ? item.image_url : null;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);

  const style: CSSProperties = {
    objectFit: item.image_fit === "cover" ? "cover" : "contain",
    transform: `translate(${item.image_x}%, ${item.image_y}%) rotate(${item.image_rotation}deg) scale(${item.image_zoom})`,
  };

  return <span className={`summer-inspiration-artwork ${className ?? ""}`} aria-hidden="true">
    {url && !failed ? <img className="summer-inspiration-artwork__photo"
      src={url} alt="" decoding="async"
      loading={className?.includes("editor") ? "eager" : "lazy"}
      style={style} onError={() => setFailed(true)} /> :
      showFallback ? <SummerSymbol kind={symbolById[item.id] ?? "flores"} /> : null}
  </span>;
}
