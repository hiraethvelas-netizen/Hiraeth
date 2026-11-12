/** Velas decorativas nas laterais, sem bloquear texto ou interações. */
export function PortalInspirationFloatingCandles() {
  return <div className="portal-inspiration-floating-candles" aria-hidden="true">
    {Array.from({ length: 8 }, (_, index) => <span key={index}
      className={`portal-inspiration-floating-candle portal-inspiration-floating-candle--${index + 1}`}>
      <span className="portal-inspiration-floating-flame" />
    </span>)}
  </div>;
}
