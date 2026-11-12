import { useState } from "react";
import { ArrowRight, Flame, MailOpen, Sparkles } from "lucide-react";

const prompts = [
  "Que livro você gostaria de transformar em uma vela?",
  "Qual aroma te faria sentir em casa hoje?",
  "Se pudesse morar em um universo por um dia, qual seria?",
  "Qual história sempre consegue acender sua imaginação?",
];

export function CommunityStorySpotlight({ onAnswer }: { onAnswer: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  return <section aria-labelledby="community-letter-title"
    className="hiraeth-community-letter relative overflow-hidden rounded-3xl border border-[#bfa06b] bg-[#f7efda] px-5 py-6 text-[#34402b] shadow-md sm:px-8 sm:py-8">
    <span className="pointer-events-none absolute -right-7 -top-7 h-28 w-28 rounded-full border border-[#bfa06b]/35" aria-hidden="true"/>
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.22em] text-[#5b1d04]"><Flame size={16}/> Uma carta para o Círculo</p>
    <h3 id="community-letter-title" className="mt-2 font-display text-3xl sm:text-4xl">Toda conversa começa com uma faísca.</h3>
    {!revealed ? <button type="button" onClick={() => setRevealed(true)}
      aria-expanded={false}
      className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[#878e47] bg-[#344b36] px-5 py-3 text-sm font-semibold text-[#f7efda] hover:bg-[#476044]">
      <MailOpen size={20}/> Abrir a pergunta da Guardiã
    </button> : <div className="mt-5 rounded-2xl border border-[#c4ab7f] bg-[#ede4d0] p-5">
      <p className="text-xs uppercase tracking-[.2em] text-[#5b1d04]">Pergunta para compartilhar</p>
      <p className="mt-2 font-display text-2xl leading-tight">{prompts[index]}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onAnswer} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#5b1d04] px-4 py-2 text-xs font-semibold text-[#f7efda]">Responder no Feed <ArrowRight size={15}/></button>
        <button type="button" onClick={() => setIndex(value => (value + 1) % prompts.length)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#878e47] px-4 py-2 text-xs font-semibold text-[#34402b]"><Sparkles size={15}/> Outra pergunta</button>
      </div>
    </div>}
  </section>;
}
