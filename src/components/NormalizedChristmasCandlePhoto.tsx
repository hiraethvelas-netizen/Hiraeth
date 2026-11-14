import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { christmasCandleFrame } from "@/lib/christmas-image-framing";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string };

/**
 * A display-only normalization: never overwrites the uploaded photo or label.
 * If CORS or canvas sampling is unavailable, the unmodified photo still shows.
 */
export function NormalizedChristmasCandlePhoto({ src, alt, style, ...props }: Props) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
    if (!src || typeof Image === "undefined" || typeof document === "undefined") return;
    let active = true;
    const photo = new Image();
    photo.crossOrigin = "anonymous";
    photo.onload = () => {
      if (!active || !photo.naturalWidth || !photo.naturalHeight) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 150;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const frame = christmasCandleFrame(pixels.data, pixels.width, pixels.height);
        if (active) setScale(frame.scale);
      } catch {
        // Images served without cross-origin canvas access stay visible at 1x.
      }
    };
    photo.onerror = () => { /* Keep the displayed photo unchanged. */ };
    photo.src = src;
    return () => {
      active = false;
      photo.onload = null;
      photo.onerror = null;
    };
  }, [src]);

  return <img {...props} src={src} alt={alt ?? ""}
    style={{ ...style, transform: `scale(${scale})`, transformOrigin: "center center" }} />;
}
