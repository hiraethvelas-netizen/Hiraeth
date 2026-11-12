import { useState } from "react";
import { Flame, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;

export function PortalGuardianLetter({ fragment }: { fragment: Fragment | null | undefined }) {
  const [opened, setOpened] = useState(false);
  if (!fragment) return null;

  return <section id="portal-carta-da-guardia" aria-labelledby="portal-guardian-letter-title"
    className="portal-guardian-letter relative z-10 mx-auto mt-9 max-w-2xl scroll-mt-8 px-2 text-center">
    <h3 id="portal-guardian-letter-title"
      className="portal-script-title !text-[clamp(1.65rem,5vw,2.7rem)] !leading-tight">
      Uma carta da Guardiã da Chama
    </h3>
    <button type="button" aria-expanded={opened} aria-controls="portal-guardian-letter-content"
      aria-label={opened ? "Fechar carta" : "Toque no selo vermelho para abrir a carta"}
      onClick={() => setOpened(value => !value)}
      className="group mx-auto mt-3 block w-full max-w-[275px] rounded-xl p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e1c48e]">
      {!opened ? <>
        <span className="relative block h-32 overflow-hidden rounded-lg border border-[#b7a080] bg-[#d7c6a5] shadow-[0_12px_28px_rgba(0,0,0,.24)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none">
          <span className="absolute inset-0 bg-[#e9ddc4] [clip-path:polygon(0_0,50%_62%,100%_0)]" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 h-[64%] bg-[#e3d2ae] [clip-path:polygon(0_100%,50%_0,100%_100%)]" aria-hidden="true" />
          <span className="absolute left-1/2 top-[55%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#9e6e47] bg-[#5b1d04] text-[#f7efda] shadow-md" aria-hidden="true">
            <Flame size={22} />
          </span>
        </span>
        <span className="mt-2 block text-xs font-medium text-[#e8cf9b]">Toque no selo vermelho para abrir a carta</span>
      </> : <span className="inline-flex items-center gap-2 rounded-full border border-[#d3b575] px-5 py-2 text-sm text-[#f7efda]">
        <X size={15} /> Fechar carta
      </span>}
    </button>
    {opened && <article id="portal-guardian-letter-content"
      className="mx-auto mt-3 max-w-[600px] rounded-lg border border-[#c4ad7b] bg-[#f7efda] px-5 py-5 text-left text-[#513c2b] shadow-[0_12px_32px_rgba(0,0,0,.21)] sm:px-8 sm:py-6">
      <h4 className="mb-3 text-center font-display text-xl leading-snug sm:text-2xl">{fragment.title}</h4>
      <p className="whitespace-pre-line font-serif text-[.94rem] leading-[1.55] sm:text-base sm:leading-[1.6]">{fragment.body}</p>
    </article>}
  </section>;
}
