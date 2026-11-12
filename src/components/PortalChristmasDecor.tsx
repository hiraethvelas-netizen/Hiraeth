import { useState } from "react";
import { Sparkles } from "lucide-react";

type Scene = "hero" | "actions" | "inspirations" | "gallery";
type Props = { scene: Scene };

/**
 * Decoration stays inside the magic NFC page. The existing class names keep
 * the page integration stable; "Mais magia" controls only the colored lights.
 */
export function PortalChristmasDecor({ scene }: Props) {
  const [brighter, setBrighter] = useState(false);
  const candles = scene === "hero" ? 7 : scene === "actions" ? 5 : 3;
  const stars = scene === "hero" ? 10 : scene === "actions" ? 6 : 4;
  const bulbs = scene === "inspirations" ? 10 : 16;

  return (
    <div
      className={`portal-xmas-decor portal-xmas-decor--${scene}${brighter ? " portal-xmas-decor--bright" : ""}`}
    >
      <div className="portal-xmas-atmosphere" aria-hidden="true">
        {scene === "hero" && brighter && <div className="portal-xmas-extra-sparks" aria-hidden="true">
          {[
            ["11%", "25%"], ["23%", "62%"], ["35%", "17%"], ["47%", "74%"],
            ["58%", "35%"], ["71%", "57%"], ["83%", "18%"], ["91%", "72%"],
            ["16%", "85%"], ["63%", "88%"], ["79%", "43%"], ["39%", "48%"],
          ].map(([left, top], index) => <span key={index}
            className="portal-xmas-extra-spark"
            style={{ left, top, animationDelay: `-${index * 0.27}s` }} />)}
        </div>}
        <div className="portal-xmas-fairy-lights">
          {Array.from({ length: bulbs }, (_, index) => (
            <span key={index} className="portal-xmas-bulb" />
          ))}
        </div>
        {(scene === "hero" || scene === "actions") && (
          <div className="portal-xmas-hanging-ornaments">
            {Array.from({ length: scene === "hero" ? 4 : 3 }, (_, index) => (
              <span
                key={index}
                className={`portal-xmas-bauble portal-xmas-bauble--${index}`}
                style={{ left: ["5%", "21%", "77%", "92%"][index], top: ["48px", "67px", "42px", "62px"][index] }}
              />
            ))}
          </div>
        )}
        <div className="portal-magic-stars">
          {Array.from({ length: stars }, (_, index) => (
            <span key={index} className="portal-magic-star">
              ✦
            </span>
          ))}
        </div>
        <div className="portal-xmas-floating-candles">
          {Array.from({ length: candles }, (_, index) => (
            <span key={index} className="portal-xmas-candle">
              <span className="portal-xmas-flame" />
            </span>
          ))}
        </div>
        <div className="portal-magic-astrolabe" />
        {scene === "inspirations" && <div className="portal-xmas-owl-photo" />}
        {scene === "gallery" && <div className="portal-xmas-broom-photo" />}
        <div className="portal-xmas-dust" />
      </div>
      {scene === "hero" && (
        <button
          type="button"
          className="portal-xmas-lights-toggle"
          aria-pressed={brighter}
          aria-label={brighter ? "Mais magia: apagar luzes coloridas" : "Mais magia: acender luzes coloridas"}
          onClick={() => setBrighter((value) => !value)}
        >
          <Sparkles aria-hidden="true" size={17} strokeWidth={1.6} />
          <span>Mais magia</span>
          <Sparkles aria-hidden="true" size={14} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}
