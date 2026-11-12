import { useState } from "react";
import { BookHeart, ChevronDown, Heart } from "lucide-react";

export function LibraryWelcomeNote({ total, finished }: { total: number; finished: number }) {
  const [open, setOpen] = useState(false);
  return <section className="hiraeth-library-note relative mt-6 rounded-3xl border border-[#bda16c] bg-[#20382b] p-5 text-[#f7efda] shadow-md sm:p-7"
    aria-label="Um bilhete para sua estante">
    <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#e1ca98]">Seu cantinho de histórias</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="flex min-h-14 items-center gap-2 rounded-full border border-[#d8bd84]/55 px-5 py-2 text-xs"><BookHeart size={20}/><strong className="text-lg">{total}</strong> velas na estante</div>
      {finished > 0 && <div className="flex min-h-14 items-center gap-2 rounded-full border border-[#d8bd84]/55 px-5 py-2 text-xs"><Heart size={19}/><strong className="text-lg">{finished}</strong> lembranças encerradas</div>}
    </div>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e1ca98] px-5 py-2 text-sm font-medium text-[#f7efda] hover:bg-[#f7efda]/10">
      {open ? "Fechar bilhete" : "Abrir um bilhete para sua estante"} <ChevronDown size={16} className={open ? "rotate-180" : ""}/>
    </button>
    {open && <div className="mt-4 max-w-2xl rounded-2xl border border-[#dbba82]/60 bg-[#f7efda] px-5 py-5 text-[#34402b]">
      <p className="font-display text-2xl italic">Nem toda chama que se apaga chega ao fim.</p>
      <p className="mt-2 text-sm leading-7">As velas que você viveu continuam guardadas aqui, com seus aromas, lembranças e histórias. Toque em uma vela da estante para revisitar esse capítulo.</p>
      <p className="mt-2 text-xs text-[#5b1d04]">Ao marcar “Vela acabou”, ela permanece na sua Biblioteca como uma lembrança.</p>
    </div>}
  </section>;
}
