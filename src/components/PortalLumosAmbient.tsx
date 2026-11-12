/** Luzes decorativas distribuídas por toda a altura da página do Portal NFC.
 *  O efeito é puramente visual, sem interferir na navegação ou na leitura.
 */
export function PortalLumosAmbient({ active }: { active: boolean }) {
  return <div className={"portal-lumos-ambient" + (active ? " portal-lumos-ambient--active" : "")}
    data-testid="portal-lumos-ambient" data-active={String(active)} aria-hidden="true">
    {Array.from({ length: 52 }, (_, index) => {
      const row = Math.floor(index / 4);
      const column = index % 4;
      const left = [3, 10 + (row % 3) * 2, 88 - (row % 3) * 2, 97][column]!;
      const top = 2 + row * 7.7 + (column % 2) * 1.3;
      return <span key={index} className="portal-lumos-ambient__light"
        style={{
          left: `${left}%`, top: `${top}%`,
          animationDelay: `-${((index * 7) % 19) / 10}s`,
        }} />;
    })}
  </div>;
}
