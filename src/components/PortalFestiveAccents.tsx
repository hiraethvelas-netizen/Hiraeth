type Props = { variant: "natal" | "inspiracoes"; brighter?: boolean };

const houses = ["leao", "texugo", "aguia", "serpente"] as const;

/** Purely decorative lights, antique-glass baubles and striped house ribbons.
 *  Keeps text and buttons accessible and allows reduced-motion preferences.
 */
export function PortalFestiveAccents({ variant, brighter = false }: Props) {
  return (
    <div
      className={`portal-festive-accents portal-festive-accents--${variant}${brighter ? " portal-festive-accents--bright" : ""}`}
      aria-hidden="true"
    >
      <div className="portal-festive-accents__lights">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="portal-festive-accents__bulb" />
        ))}
      </div>
      <div className="portal-festive-accents__ornaments">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={`portal-festive-accents__bauble portal-festive-accents__bauble--${i}`}
          />
        ))}
      </div>
      <div className="portal-festive-accents__ribbons">
        {houses.map((house) => (
          <span key={house} className={`portal-house-ribbon portal-house-ribbon--${house}`} />
        ))}
      </div>
    </div>
  );
}

/** A separate decorative finish; never crosses a button or candle image. */
export function PortalHouseRibbons() {
  return (
    <div
      className="portal-house-footer"
      role="img"
      aria-label="Faixas das casas: Grifinória, Lufa-Lufa, Corvinal e Sonserina"
    >
      {houses.map((house) => (
        <span
          key={house}
          aria-hidden="true"
          className={`portal-house-ribbon portal-house-ribbon--${house}`}
        />
      ))}
    </div>
  );
}
