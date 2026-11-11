import { useState } from "react";
import { Sparkles } from "lucide-react";

type Scene = "hero" | "actions" | "inspirations" | "gallery";
type Props = { scene: Scene; brighter?: boolean; onToggle?: () => void };

/**
 * Decoration stays inside the magic NFC page. The existing class names keep
 * the page integration stable; "Mais magia" controls the lights and baubles.
 */
export function PortalChristmasDecor({ scene, brighter, onToggle }: Props) {
  const [localBrighter, setLocalBrighter] = useState(false);
  const active = brighter ?? localBrighter;
  const candles = scene === "hero" ? 7 : scene === "actions" ? 5 : 3;
  const stars = scene === "hero" ? 10 : scene === "actions" ? 6 : 4;
  const bulbs = scene === "inspirations" ? 10 : 16;

  return (
    <div
      className={`portal-xmas-decor portal-xmas-decor--${scene}${active ? " portal-xmas-decor--bright" : ""}`}
    >
      <div className="portal-xmas-atmosphere" aria-hidden="true">
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
                style={{
                  left: ["5%", "21%", "77%", "92%"][index],
                  top: ["48px", "67px", "42px", "62px"][index],
                }}
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
          aria-pressed={active}
          aria-label="Mais magia: acender luzes coloridas"
          onClick={() => (onToggle ? onToggle() : setLocalBrighter((value) => !value))}
        >
          <Sparkles aria-hidden="true" size={17} strokeWidth={1.6} />
          <span>Mais magia</span>
          <Sparkles aria-hidden="true" size={14} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}
