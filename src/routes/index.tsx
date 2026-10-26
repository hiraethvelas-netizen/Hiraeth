import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import banner from "@/assets/banner-portal.png";
import fenix from "@/assets/fenix.png";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CinematicOpening } from "@/components/CinematicOpening";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hiraeth — Velas literárias e camisetas" },
      { name: "description", content: "Velas literárias e camisetas inspiradas nos universos que moram em você." },
      { property: "og:title", content: "Hiraeth — O Portal Foi Aberto" },
      { property: "og:description", content: "Velas literárias e camisetas inspiradas nos universos que moram em você." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <img src={banner} alt="" className="animate-portal absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-overlay" />
      <div className="animate-portal relative px-6 text-center">
        <h2 className="text-5xl text-foreground md:text-7xl">O Portal Foi Aberto</h2>
        <p className="eyebrow mt-4 text-xl">Bem-vindo ao Círculo do Fogo</p>
      </div>
      <button onClick={onDone} className="absolute bottom-6 right-6 border px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-primary">
        Pular
      </button>
    </div>
  );
}

function Index() {
  return <CinematicOpening />;
}

// Preserve the existing homepage content and newsletter flow without displaying
// them inside the exclusive, non-scrolling entrance.
export function ExistingHomepage() {
  const [intro, setIntro] = useState(true);
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      {intro && <Intro onDone={() => setIntro(false)} />}
      <SiteHeader />

      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
        <img src={banner} alt="Portal de pedra na floresta com castelo ao fundo" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-overlay" />
        <div className="relative max-w-2xl px-6 text-center">
          <p className="eyebrow text-xl">Bem-vindo ao Círculo do Fogo</p>
          <h1 className="mt-3 text-5xl md:text-7xl">O Portal Foi Aberto</h1>
          <p className="mt-6 text-lg text-foreground/85">
            Velas literárias e camisetas inspiradas nos universos que moram em você.
          </p>
          <Link to="/sobre" className="btn-gold mt-10">Conhecer a Hiraeth</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-24 md:grid-cols-2">
        <img src={fenix} alt="Fênix Hiraeth" className="mx-auto w-64 md:w-80" loading="lazy" />
        <div>
          <p className="eyebrow">A história da Hiraeth</p>
          <h2 className="mt-2 text-4xl">Guardiã da chama</h2>
          <p className="mt-5 leading-relaxed text-foreground/85">
            Hiraeth é a saudade de um lugar ao qual talvez nunca tenhamos ido. Cada vela guarda um universo — um livro, um filme, uma série — para ser reaceso sempre que você quiser voltar.
          </p>
          <Link to="/sobre" className="btn-gold mt-8">Ler nossa história</Link>
        </div>
      </section>

      <section className="border-y bg-card px-6 py-24 text-center">
        <p className="eyebrow">Para a chama durar</p>
        <h2 className="mt-2 text-4xl">Cuidados com as velas</h2>
        <p className="mx-auto mt-5 max-w-xl text-foreground/85">
          Pequenos rituais que fazem sua vela queimar por igual, com segurança e por mais tempo.
        </p>
        <Link to="/cuidados" className="btn-gold mt-8">Ver cuidados</Link>
      </section>

      <section className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="eyebrow">Newsletter</p>
        <h2 className="mt-2 text-4xl">Cartas do Círculo</h2>
        <p className="mt-5 text-foreground/85">Receba novidades, edições limitadas e portais recém-abertos.</p>
        {sent ? (
          <p className="eyebrow mt-8 text-xl">Sua carta está a caminho. ✦</p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const email = new FormData(e.currentTarget).get("email") as string;
              const { error } = await supabase.from("newsletter_subscribers").insert({ email });
              if (error && !error.message.includes("duplicate")) return;
              setSent(true);
            }}
          >
            <input type="email" name="email" required placeholder="seu@email.com" className="flex-1 border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            <button type="submit" className="btn-gold justify-center">Quero receber</button>
          </form>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Ao se inscrever você concorda com nossa{" "}
          <Link to="/privacidade" className="underline hover:text-primary">política de privacidade</Link>.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
