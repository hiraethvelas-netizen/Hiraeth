import { useState } from "react";
import { ArrowUpRight, BookOpen, Flame, Nfc, Smartphone, X } from "lucide-react";

type Chapter = "toque" | "portal" | "app";
const chapters: { id: Chapter; title: string; note: string }[] = [
  { id: "toque", title: "Aproxime", note: "Uma vela Hiraeth com NFC carrega um acesso ao seu portal digital. Aproxime um celular compatível da área indicada da vela." },
  { id: "portal", title: "Atravesse", note: "O celular abre uma página com a experiência daquele universo: inspirações, histórias e outros detalhes da coleção." },
  { id: "app", title: "Permaneça", note: "No aplicativo Hiraeth, o Acervo, o Círculo do Fogo e a Biblioteca continuam essa experiência além da vela." },
];

export function AproxExperience() {
  const [opened, setOpened] = useState(false);
  const [chapter, setChapter] = useState<Chapter>("toque");
  const [simulated, setSimulated] = useState(false);
  const active = chapters.find(item => item.id === chapter)!;

  return <section id="aprox-nfc" aria-labelledby="aprox-heading"
    className="hiraeth-aprox relative scroll-mt-8 overflow-hidden rounded-3xl border border-[#c6a65b]/65 bg-[#1c3026] px-5 py-9 text-[#f7efda] shadow-lg sm:px-9 sm:py-11">
    <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-[#c6a65b]/25" aria-hidden="true" />
    <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#e4ca94]">Hiraeth × APROX · Tecnologia NFC</p>
    <h2 id="aprox-heading" className="mt-3 font-display text-3xl leading-tight sm:text-5xl">Quando a chama encontra a tecnologia.</h2>
    <p className="mt-3 max-w-lg text-sm leading-7 text-[#eee3cc] sm:text-base">Uma história não precisa terminar quando você apaga a vela. Com a tecnologia Aprox, ela pode continuar em um portal digital.</p>
    <button type="button" aria-expanded={opened} aria-controls="aprox-letter"
      onClick={() => setOpened(value => !value)}
      className="group mx-auto mt-7 flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-[#d2b681]/40 bg-[#f7efda]/[.07] p-5 text-[#f7efda] transition-colors hover:bg-[#f7efda]/[.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4d49e]">
      <span className="relative flex h-24 w-40 items-center justify-center rounded-xl border border-[#d4b680] bg-[#e6d4b2] shadow-xl transition-transform group-hover:-translate-y-1" aria-hidden="true">
        <span className="absolute inset-x-0 top-0 h-[67%] bg-[#f4e5c9] [clip-path:polygon(0_0,50%_90%,100%_0)]"/>
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#b77b51] bg-[#5b1d04] text-[#f7efda]"><Nfc size={23}/></span>
      </span>
      <span className="font-display text-xl italic">{opened ? "Fechar a carta da Aprox" : "Abra o segredo da aproximação"}</span>
      <span className="text-xs text-[#e4ca94]">{opened ? "Toque para recolher" : "Um toque revela como funciona"}</span>
    </button>
    {opened && <div id="aprox-letter" className="mt-6 rounded-2xl border border-[#c6a65b]/50 bg-[#f7efda] p-5 text-[#34402b] sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#5b1d04]">Mais do que tecnologia, conexões reais.</p>
      <h3 className="mt-2 font-display text-3xl">Como funciona a experiência?</h3>
      <p className="mt-2 text-sm leading-6">A Hiraeth transforma histórias em aromas. A Aprox conecta a vela ao universo digital por NFC e desenvolveu o aplicativo da Hiraeth.</p>
      <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Etapas da experiência NFC">
        {chapters.map((item, index) => <button type="button" key={item.id}
          onClick={() => setChapter(item.id)} aria-pressed={chapter === item.id}
          className={"min-h-12 rounded-full border px-2 py-2 text-xs font-semibold transition-colors sm:text-sm " + (chapter === item.id ? "border-[#34402b] bg-[#34402b] text-[#f7efda]" : "border-[#878e47]/60 bg-[#f1ead7] text-[#34402b] hover:bg-[#e5e6d0]")}>
          {index + 1}. {item.title}
        </button>)}
      </div>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div>
          <h4 className="font-display text-2xl text-[#34402b]">{active.title}</h4>
          <p className="mt-2 text-sm leading-7 text-[#4c513f]">{active.note}</p>
          {chapter === "toque" && <p className="mt-3 text-xs leading-5 text-[#626349]">Para abrir o portal, o celular precisa ser compatível com NFC, ter a função ativada quando necessário e acesso à internet. Não é preciso instalar o aplicativo apenas para abrir o link.</p>}
          {chapter === "app" && <a href="/loja" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#5b1d04] px-5 py-3 text-xs font-semibold text-[#f7efda]">Conhecer o Acervo <ArrowUpRight size={15}/></a>}
        </div>
        <button type="button" onClick={() => setSimulated(value => !value)}
          aria-pressed={simulated} aria-label={simulated ? "Reiniciar demonstração da aproximação" : "Simular aproximação NFC"}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-[#a39c79] bg-[#eae1cc] p-4 text-[#34402b]">
          {simulated ? <><Flame size={30} className="text-[#5b1d04]"/><span className="text-center font-display text-xl">Portal aberto</span></>
            : <><Smartphone size={32}/><Nfc size={20}/><span className="text-center text-xs font-medium">Toque para simular</span></>}
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-[#626349]">Demonstração ilustrativa: o NFC real está nas velas compatíveis.</p>
    </div>}
  </section>;
}
