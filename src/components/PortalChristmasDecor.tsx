import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { phoenixCourierImage } from "@/assets/phoenix-courier-data";

type Scene = "hero" | "actions" | "inspirations" | "gallery";
type Props = { scene: Scene };

function ChristmasTree({ side }: { side: "left" | "right" }) {
  return <div className={`portal-xmas-tree portal-xmas-tree--${side}`} aria-hidden="true">
    <div className="portal-xmas-tree-star" />
    <div className="portal-xmas-tree-crown">
      <span className="portal-xmas-tree-tier portal-xmas-tree-tier--top" />
      <span className="portal-xmas-tree-tier portal-xmas-tree-tier--middle" />
      <span className="portal-xmas-tree-tier portal-xmas-tree-tier--bottom" />
      <span className="portal-xmas-tree-garland portal-xmas-tree-garland--first" />
      <span className="portal-xmas-tree-garland portal-xmas-tree-garland--second" />
      <span className="portal-xmas-tree-bauble portal-xmas-tree-bauble--one" />
      <span className="portal-xmas-tree-bauble portal-xmas-tree-bauble--two" />
      <span className="portal-xmas-tree-bauble portal-xmas-tree-bauble--three" />
      <span className="portal-xmas-tree-bauble portal-xmas-tree-bauble--four" />
    </div>
    <span className="portal-xmas-tree-trunk" />
  </div>;
}

function ChristmasPresents({ side }: { side: "left" | "right" }) {
  return <div className={`portal-xmas-presents portal-xmas-presents--${side}`} aria-hidden="true">
    <span className="portal-xmas-present portal-xmas-present--wine" />
    <span className="portal-xmas-present portal-xmas-present--forest" />
    <span className="portal-xmas-present portal-xmas-present--gold" />
  </div>;
}

function PhoenixDelivery({ onFinish }: { onFinish: () => void }) {
  return <div className="portal-xmas-phoenix-flight" aria-hidden="true"
    onAnimationEnd={event => { if (event.currentTarget === event.target) onFinish(); }}>
    <div className="portal-xmas-phoenix-trail" />
    <div className="portal-xmas-phoenix-courier">
      <img src={phoenixCourierImage} alt="" className="portal-xmas-phoenix-bird" />
      <span className="portal-xmas-phoenix-caption">Correio da Fênix</span>
      </div>
    </div>
  </div>;
}

/**
 * Seasonal decoration belongs exclusively to the magic NFC page. No large
 * background photos or external scripts. Real-time links and NFC URLs remain
 * untouched. A click on "Mais magia" animates the existing phoenix artwork
 * carrying a parcel across the upper viewport.
 */
export function PortalChristmasDecor({ scene }: Props) {
  const [brighter, setBrighter] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const [flying, setFlying] = useState(false);
  const candles = scene === "hero" ? 7 : scene === "actions" ? 5 : 3;
  const baubles = scene === "hero" ? 10 : scene === "actions" ? 6 : 4;
  const bulbs = scene === "inspirations" ? 10 : 16;

  function triggerMagic() {
    setBrighter(value => !value);
    setFlightKey(value => value + 1);
    setFlying(true);
  }

  return <>
    <div className={`portal-xmas-decor portal-xmas-decor--${scene}${brighter ? " portal-xmas-decor--bright" : ""}`}>
      <div className="portal-xmas-atmosphere" aria-hidden="true">
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
        {(scene === "hero" || scene === "actions" || scene === "gallery") && <>
          <ChristmasTree side="left" />
          <ChristmasPresents side="right" />
        </>}
        {scene === "actions" && <ChristmasTree side="right" />}
        {scene === "gallery" && <ChristmasPresents side="left" />}
        {scene === "inspirations" && <div className="portal-xmas-owl-photo" />}
        {scene === "gallery" && <div className="portal-xmas-broom-photo" />}
        <div className="portal-xmas-dust" />
      </div>
      {scene === "hero" && (
        <button type="button" className="portal-xmas-lights-toggle"
          aria-pressed={brighter}
          aria-label="Mais magia: acender luzes e chamar o Correio da Fênix"
          onClick={triggerMagic}>
          <Sparkles aria-hidden="true" size={17} strokeWidth={1.6} />
          <span>Mais magia</span>
          <Sparkles aria-hidden="true" size={14} strokeWidth={1.6} />
        </button>
      )}
    </div>
    {flying && typeof document !== "undefined" && createPortal(
      <PhoenixDelivery key={flightKey} onFinish={() => setFlying(false)} />,
      document.body
    )}
  </>;
}
