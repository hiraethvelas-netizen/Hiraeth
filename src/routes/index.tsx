import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import banner from "@/assets/banner-portal.png";
import fenix from "@/assets/fenix.png";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CinematicOpening } from "@/components/CinematicOpening";

type Shortcut = { id: string; title: string; description: string | null; href: string; image_key: string; position: number; active: boolean };
type HomeBanner = { id: string; title: string | null; image_url: string; href: string; position: number; active: boolean };

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Hiraeth — Velas literárias e camisetas" },
    { name: "description", content: "Velas literárias e camisetas inspiradas nos universos que moram em você." },
    { property: "og:title", content: "Hiraeth — O Portal Foi Aberto" },
    { property: "og:description", content: "Velas literárias e camisetas inspiradas nos universos que moram em você." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

function Index() { return <CinematicOpening />; }

// Página principal exibida depois de atravessar o portal.
export function ExistingHomepage() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  useEffect(() => {
    (supabase as any).from("site_shortcuts").select("*").eq("active", true).order("position")
      .then(({ data }: { data: Shortcut[] | null }) => setShortcuts(data ?? []));
    (supabase as any).from("site_banners").select("*").eq("active", true).order("position")
      .then(({ data }: { data: HomeBanner[] | null }) => setBanners(data ?? []));
  }, []);
  const imageFor = (key: string) => /^https?:\\/\\//i.test(key) ? key : key === "phoenix" ? fenix : banner;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 text-center md:pt-14">
          <p className="eyebrow">Bem-vindo ao Círculo do Fogo</p>
          <h1 className="mt-2 text-4xl text-foreground md:text-5xl">Escolha seu próximo portal</h1>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {shortcuts.map((item) => (
              <Link key={item.id} to={item.href as never} className="group flex flex-col items-center gap-3 text-center">
                <span className="block aspect-square w-full max-w-40 overflow-hidden rounded-full border border-primary/40 bg-card p-1 transition-transform group-hover:scale-105">
                  <img src={imageFor(item.image_key)} alt={item.title} className="h-full w-full rounded-full object-cover" loading="lazy" />
                </span>
                <span className="font-display text-xl text-foreground">{item.title}</span>
                {item.description && <span className="max-w-40 text-sm text-muted-foreground">{item.description}</span>}
              </Link>
            ))}
            {shortcuts.length === 0 && <Link to="/loja" className="mx-auto flex flex-col items-center gap-3"><span className="flex aspect-square w-36 items-center justify-center rounded-full border border-primary/40 bg-card p-5 text-center font-display text-xl text-foreground">Acessar a Loja</span></Link>}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-8 md:py-12">
          <h2 className="font-display text-3xl text-foreground md:text-4xl">Novidades do Círculo</h2>
          <div className="mt-6 flex snap-x gap-5 overflow-x-auto pb-4">
            {(banners.length ? banners : [{ id: "fallback", title: "Explore os universos literários da Hiraeth", image_url: banner, href: "/loja", position: 1, active: true }]).map((item) => (
              <Link key={item.id} to={item.href as never} className="group block w-full min-w-full snap-start overflow-hidden rounded-sm">
                <img src={item.image_url} alt={item.title || "Novidade Hiraeth"} className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-72 md:h-[28rem] lg:h-[32rem]" loading="lazy" />
                {item.title && <span className="sr-only">{item.title}</span>}
              </Link>
            ))}
          </div>
        </section>
        <section className="border-y bg-card px-6 py-16 text-center">
          <p className="eyebrow">Para a chama durar</p>
          <h2 className="mt-2 text-4xl text-foreground">Cuidados com as velas</h2>
          <p className="mx-auto mt-5 max-w-xl text-foreground/85">Pequenos rituais que fazem sua vela queimar por igual, com segurança e por mais tempo.</p>
          <Link to="/cuidados" className="btn-gold mt-8">Ver cuidados</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
