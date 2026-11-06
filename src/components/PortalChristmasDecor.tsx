import { useState } from "react";
import { Sparkles } from "lucide-react";

type Scene = "hero" | "actions" | "inspirations" | "gallery";
type Props = { scene: Scene };

/**
 * Only the published Christmas world uses these decorations.
 * Photographic scenery is blended into the page; the small light and candle
 * effects are visual layers and cannot intercept links or content.
 */
export function PortalChristmasDecor({ scene }: Props) {
  const [brighter, setBrighter] = useState(false);
  const candles = scene === "hero" ? 7 : scene === "actions" ? 5 : 3;
  const baubles = scene === "hero" ? 10 : scene === "actions" ? 6 : 4;
  const bulbs = scene === "inspirations" ? 10 : 16;

  return (
    <div className={`portal-xmas-decor portal-xmas-decor--${scene}${brighter ? " portal-xmas-decor--bright" : ""}`}>
      <div className="portal-xmas-atmosphere" aria-hidden="true">
        <div className="portal-xmas-photographic-scene" />
        <div className="portal-xmas-fairy-lights">
          {Array.from({ length: bulbs }, (_, index) =>
            <span key={index} className="portal-xmas-bulb" />
          )}
        </div>
        <div className="portal-xmas-hanging-ornaments">
          {Array.from({ length: baubles }, (_, index) =>
            <span key={index} className={`portal-xmas-bauble portal-xmas-bauble--${index % 3}`} />
          )}
        </div>
        <div className="portal-xmas-floating-candles">
          {Array.from({ length: candles }, (_, index) =>
            <span key={index} className="portal-xmas-candle">
              <span className="portal-xmas-flame" />
            </span>
          )}
        </div>
        {scene === "inspirations" && <div className="portal-xmas-owl-photo" />}
        {scene === "gallery" && <div className="portal-xmas-broom-photo" />}
        <div className="portal-xmas-dust" />
      </div>
      {scene === "hero" && (
        <button type="button" className="portal-xmas-lights-toggle"
          aria-pressed={brighter}
          aria-label={brighter ? "Suavizar as luzes mágicas" : "Intensificar as luzes mágicas"}
          onClick={() => setBrighter(value => !value)}>
          <Sparkles aria-hidden="true" size={16} strokeWidth={1.5} />
          <span>{brighter ? "Suavizar as luzes" : "Mais magia"}</span>
        </button>
      )}
    </div>
  );
}
