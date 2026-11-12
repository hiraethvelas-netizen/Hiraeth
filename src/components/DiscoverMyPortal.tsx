import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Sparkles, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { findPortalForMood, PORTAL_MOODS, type PortalMood } from "@/lib/portal-finder";

type Props = { products: Tables<"products">[]; categories: Tables<"categories">[] };

export function DiscoverMyPortal({ products, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<PortalMood | null>(null);
  const [reveal, setReveal] = useState(false);
  const result = mood && reveal ? findPortalForMood(products, categories, mood) : null;
  function close() { setOpen(false); setMood(null); setReveal(false); }

  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="hiraeth-portal-finder-trigger inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c6a65b] bg-[#263c2d] px-5 py-2 text-xs font-semibold text-[#f7efda] shadow-sm transition hover:bg-[#38523c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6a65b]">
      <Compass size={17} aria-hidden="true"/> Descobrir meu portal
    </button>
    {open && <div className="fixed inset-0 z-[155] flex items-center justify-center overflow-y-auto bg-[#101a13]/85 p-3 backdrop-blur-sm sm:p-5">
      <section className="relative my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#d4b47e] bg-[#f7efda] px-5 py-8 text-[#34402b] shadow-2xl sm:px-9"
        role="dialog" aria-modal="true" aria-labelledby="portal-finder-title">
        <button type="button" onClick={close} aria-label="Fechar Descobrir meu portal" className="absolute right-4 top-4 rounded-full border border-[#878e47]/50 p-2"><X size={19}/></button>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#5b1d04]">O oráculo da Guardiã</p>
        <h2 id="portal-finder-title" className="mt-3 font-display text-4xl">Qual chama combina com você hoje?</h2>
        <p className="mt-3 text-sm leading-6 text-[#4d5543]">Escolha um sentimento. Nós buscamos uma vela publicada no Acervo para te acompanhar.</p>
        {!reveal ? <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {PORTAL_MOODS.map(item => <button type="button" key={item.id} aria-pressed={mood === item.id}
              onClick={() => setMood(item.id)}
              className={"min-h-28 rounded-2xl border px-3 py-4 text-center transition-colors " + (mood === item.id ? "border-[#5b1d04] bg-[#e5d5b6] text-[#34402b] ring-2 ring-[#5b1d04]/20" : "border-[#878e47]/60 bg-[#f3ebda] text-[#34402b] hover:bg-[#e5e6d0]")}>
              <span className="block font-display text-2xl">{item.label}</span>
              <span className="mt-2 block text-xs leading-snug">{item.description}</span>
            </button>)}
          </div>
          <button type="button" disabled={!mood} onClick={() => setReveal(true)}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#5b1d04] px-6 py-3 text-sm font-semibold text-[#f7efda] disabled:opacity-45">
            Revelar meu portal <Sparkles size={17}/>
          </button>
        </> : <div className="mt-6 text-center">
          <p className="text-xs uppercase tracking-[.18em] text-[#6c713d]">{result?.matched ? "Uma chama para o seu momento" : "Um portal para começar a explorar"}</p>
          {result ? <>
            {result.product.images?.[0] && <img src={result.product.images[0]} alt={result.product.name}
              className="mx-auto mt-4 h-44 w-full object-contain" />}
            <h3 className="mt-3 font-display text-3xl">{result.product.name}</h3>
            <Link to="/produto/$slug" params={{ slug: result.product.slug }} onClick={close}
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#5b1d04] px-6 py-3 text-sm font-semibold text-[#f7efda]">
              Conhecer esta vela <ArrowRight size={17}/>
            </Link>
          </> : <p className="mt-5 text-sm">O Acervo está sendo preparado. Novas chamas chegarão em breve.</p>}
          <button type="button" onClick={() => { setMood(null); setReveal(false); }}
            className="mx-auto mt-4 block rounded-full border border-[#878e47]/70 px-5 py-2 text-xs font-semibold">Tentar outro caminho</button>
        </div>}
      </section>
    </div>}
  </>;
}
