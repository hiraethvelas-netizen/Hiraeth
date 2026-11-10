type Props = { variant: "natal" | "inspiracoes" };

const houses = ["leao", "texugo", "aguia", "serpente"] as const;

/** Purely decorative lights, antique-glass baubles and striped house ribbons.
 *  Keeps text and buttons accessible and allows reduced-motion preferences.
 */
export function PortalFestiveAccents({ variant }: Props) {
  return (
    <div className={`portal-festive-accents portal-festive-accents--${variant}`} aria-hidden="true">
      <div className="portal-festive-accents__lights">
        {Array.from({ length: 20 }, (_, i) =>
          <span key={i} className="portal-festive-accents__bulb" />)}
      </div>
      <div className="portal-festive-accents__ornaments">
        {Array.from({ length: 4 }, (_, i) =>
          <span key={i} className={`portal-festive-accents__bauble portal-festive-accents__bauble--${i}`} />)}
      </div>
      <div className="portal-festive-accents__ribbons">
        {houses.map(house =>
          <span key={house} className={`portal-house-ribbon portal-house-ribbon--${house}`} />)}
      </div>
    </div>
  );
}
