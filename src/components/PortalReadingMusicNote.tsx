import { useState } from "react";
import { Music2 } from "lucide-react";

/** Pequeno bilhete musical acionado pela própria pessoa, sem tocar áudio. */
export function PortalReadingMusicNote() {
  const [open, setOpen] = useState(false);

  return <div className="flex flex-col items-center gap-2">
    <button type="button"
      aria-label="Abrir dica musical para a leitura"
      aria-expanded={open}
      aria-controls="portal-reading-music-note"
      onClick={() => setOpen(value => !value)}
      title="Uma trilha sonora para esta leitura"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d3b575]/75 bg-[#d3b575]/10 text-[#e8d09a] transition-colors hover:bg-[#d3b575]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7efda]">
      <Music2 size={19} strokeWidth={1.65} aria-hidden="true" />
    </button>
    {open && <p id="portal-reading-music-note" role="status"
      className="max-w-[270px] rounded-xl border border-[#d3b575]/35 bg-[#1b2d25]/95 px-4 py-2 text-center text-xs leading-relaxed text-[#f7efda] shadow-lg sm:text-sm">
      Leia escutando <strong className="font-semibold text-[#ead0a0]">Runaway — AURORA</strong>.
    </p>}
  </div>;
}
