import { useState } from "react";
import { Flame, Nfc } from "lucide-react";

/**
 * Carta editorial da tecnologia Aprox.
 * A experiência NFC é explicada com clareza, sem simulador e sem pop-up automático.
 */
export function AproxExperience() {
  const [opened, setOpened] = useState(false);

  return <section id="aprox-nfc" aria-labelledby="aprox-heading"
    className="hiraeth-aprox relative mx-auto w-full max-w-3xl scroll-mt-8 overflow-hidden rounded-3xl border border-[#c6a65b]/65 bg-[#1c3026] px-5 py-8 text-[#f7efda] shadow-lg sm:px-9 sm:py-10">
    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-[#c6a65b]/25" />
    <p className="text-center text-[11px] font-semibold uppercase tracking-[.22em] text-[#e4ca94]">Hiraeth × APROX · Tecnologia NFC</p>
    <h2 id="aprox-heading" className="mt-3 text-center font-display text-3xl leading-tight sm:text-4xl">Uma chama. Um toque. Um universo.</h2>
    <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-[#eee3cc]">
      Você sabia que algumas velas Hiraeth guardam uma experiência digital? Descubra o que acontece quando a tecnologia encontra as histórias.
    </p>
    <button type="button" aria-label={opened ? "Fechar carta" : "Abrir carta da Aprox"} aria-expanded={opened} aria-controls="aprox-letter"
      onClick={() => setOpened(value => !value)}
      className="group relative mx-auto mt-6 flex w-full max-w-[260px] flex-col items-center gap-3 rounded-2xl p-3 text-[#f7efda] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4d49e] motion-reduce:transition-none">
      <span aria-hidden="true" className="relative flex h-32 w-full max-w-[225px] items-center justify-center overflow-hidden rounded-xl border border-[#d4b680] bg-[#e6d4b2] shadow-[0_12px_26px_rgba(0,0,0,.24)]">
        <span className="absolute inset-x-0 top-0 h-[70%] bg-[#f3e5c8] [clip-path:polygon(0_0,50%_82%,100%_0)]" />
        <span className="absolute left-1/2 top-[57%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#b77b51] bg-[#5b1d04] text-[#f7efda] shadow-md"><Flame size={25}/></span>
      </span>
      <span className="font-display text-xl italic">{opened ? "Fechar carta" : "Abrir carta da Aprox"}</span>
      <span className="text-xs text-[#e4ca94]">{opened ? "Recolher explicação" : "Toque no selo para descobrir"}</span>
    </button>
    {opened && <article id="aprox-letter" aria-label="Carta sobre a tecnologia Aprox"
      className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#c6a65b]/55 bg-[#f7efda] p-5 text-[#34402b] shadow-xl sm:p-8">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[.19em] text-[#5b1d04]">Uma carta para quem chegou até aqui</p>
      <h3 className="mt-3 text-center font-display text-3xl leading-tight">A magia continua depois da chama.</h3>
      <p className="mt-4 text-sm leading-7">
        A Hiraeth transforma histórias em aromas. Com a tecnologia <strong>Aprox</strong>, algumas de nossas velas também podem abrir um portal digital: aproxime um celular compatível com NFC da área indicada na vela e descubra as inspirações daquele universo.
      </p>
      <p className="mt-3 text-sm leading-7">
        A Aprox também participou do desenvolvimento do aplicativo Hiraeth, onde você encontra nosso Acervo, a comunidade Círculo do Fogo e a sua Biblioteca de velas.
      </p>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#b7aa83]/55 bg-[#ede7d7] p-4 text-sm leading-6 text-[#34402b]">
        <Nfc size={22} className="mt-0.5 shrink-0 text-[#5b1d04]" aria-hidden="true"/>
        <p>O celular precisa ser compatível com NFC, com a função ativada quando necessário e acesso à internet. <strong>Não é preciso instalar o aplicativo</strong> para abrir a página do portal pelo NFC.</p>
      </div>
    </article>}
  </section>;
}
