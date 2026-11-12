import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Flame, Heart, Nfc, X } from "lucide-react";

const TOUR_KEY = "hiraeth-app-welcome-v1";
const slides = [
  { eyebrow: "01 · Bem-vinda à Hiraeth", title: "Um lugar para histórias que merecem continuar.", body: "Criamos velas inspiradas nos livros, filmes e universos que fazem você se sentir em casa. Aqui, cada chama é um convite para descobrir." },
  { eyebrow: "02 · Hiraeth × APROX", title: "Da vela ao portal, com um toque.", body: "Nas velas com NFC, a tecnologia Aprox permite abrir um portal digital ao aproximar um celular compatível. É onde a história ganha novas camadas: inspirações, aromas e experiências." },
  { eyebrow: "03 · Seu lugar por aqui", title: "Explore no seu próprio ritmo.", body: "No Acervo, encontre sua próxima vela. No Círculo do Fogo, compartilhe paixões. Na Biblioteca, guarde os portais que já fizeram parte da sua história." },
] as const;

function eligiblePage(): boolean {
  if (typeof window === "undefined") return false;
  return /^\/(inicio|loja|produto|sobre|biblioteca|comunidade|carrinho)(\/|$)/.test(window.location.pathname);
}

export function openHiraethWelcomeTour() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("hiraeth:welcome-tour"));
}

export function AppWelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      if (eligiblePage() && window.localStorage.getItem(TOUR_KEY) !== "seen") setOpen(true);
    } catch { /* a visita pode continuar sem armazenamento local */ }
    const replay = () => { setStep(0); setOpen(true); };
    window.addEventListener("hiraeth:welcome-tour", replay);
    return () => window.removeEventListener("hiraeth:welcome-tour", replay);
  }, []);
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function finish() {
    try { window.localStorage.setItem(TOUR_KEY, "seen"); } catch { /* privacidade do navegador */ }
    setOpen(false);
  }
  if (!open) return null;
  const slide = slides[step]!;

  return <div className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-[#111b15]/85 p-3 backdrop-blur-md sm:p-6"
    role="presentation">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="hiraeth-welcome-title"
      className="hiraeth-welcome-card relative my-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#d8bc85] bg-[#f7efda] p-6 text-[#34402b] shadow-[0_28px_80px_rgba(0,0,0,.5)] outline-none sm:p-9">
      <button type="button" onClick={finish} aria-label="Pular apresentação" className="absolute right-4 top-4 rounded-full border border-[#878e47]/50 p-2 text-[#34402b] hover:bg-[#e9e7d2]"><X size={19}/></button>
      <div className="mb-7 flex items-center gap-3 text-[#5b1d04]" aria-hidden="true"><Flame size={29}/><span className="font-display text-3xl italic">Hiraeth</span></div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#6f763d]">{slide.eyebrow}</p>
      <h2 id="hiraeth-welcome-title" className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl">{slide.title}</h2>
      <p className="mt-5 text-sm leading-7 text-[#4c513f] sm:text-base">{slide.body}</p>
      {step === 1 && <a href="/sobre#aprox-nfc" onClick={finish}
        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#5b1d04] underline underline-offset-4"><Nfc size={16}/> Entender a tecnologia Aprox</a>}
      {step === 2 && <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
        <div className="rounded-xl bg-[#e9e7d2] px-2 py-3"><Flame className="mx-auto mb-1" size={20}/>Acervo</div>
        <div className="rounded-xl bg-[#e9e7d2] px-2 py-3"><Heart className="mx-auto mb-1" size={20}/>Círculo</div>
        <div className="rounded-xl bg-[#e9e7d2] px-2 py-3"><BookOpen className="mx-auto mb-1" size={20}/>Biblioteca</div>
      </div>}
      <div className="mt-7 flex items-center justify-center gap-2" aria-label="Etapas da apresentação">
        {slides.map((item, i) => <span key={item.eyebrow} className={"h-1.5 rounded-full transition-all " + (step === i ? "w-9 bg-[#5b1d04]" : "w-4 bg-[#a5aa83]")} />)}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={finish} className="rounded-full px-3 py-3 text-xs font-medium text-[#5b1d04] underline underline-offset-4">Pular</button>
        <button type="button" onClick={() => step === slides.length - 1 ? finish() : setStep(value => value + 1)}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#5b1d04] px-6 py-3 text-sm font-semibold text-[#f7efda] hover:bg-[#74341a]">
          {step === slides.length - 1 ? "Entrar na Hiraeth" : "Continuar"}<ArrowRight size={16}/>
        </button>
      </div>
    </div>
  </div>;
}
