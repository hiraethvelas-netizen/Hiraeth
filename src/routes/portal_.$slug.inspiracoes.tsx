import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalInspirationChapters } from "@/components/PortalInspirationChapters";
import { PortalFestiveAccents } from "@/components/PortalFestiveAccents";
import { isMagicWorld } from "@/lib/portal-experience";
import { SiteFooter } from "@/components/SiteLayout";
import type { Tables } from "@/integrations/supabase/types";

type Portal = Tables<"portals">;
type Fragment = Tables<"portal_fragments">;

export const Route = createFileRoute("/portal_/$slug/inspiracoes")({
  head: () => ({
    meta: [
      { title: "Conheça as inspirações — Hiraeth" },
      { name: "description", content: "Os livros, cenas, lugares e aromas que inspiraram esta coleção da Hiraeth." },
    ],
  }),
  component: PortalInspirationPage,
});

function PortalInspirationPage() {
  const { slug } = Route.useParams();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const magicWorld = isMagicWorld(slug);
  const mainUrl = `/portal/${encodeURIComponent(slug)}`;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      setPortal(null);
      setFragments([]);
      try {
        const { data: p, error: pError } = await supabase.from("portals")
          .select("*").eq("slug", slug).eq("status", "published").maybeSingle();
        if (pError) throw pError;
        if (!p) throw new Error("Portal não encontrado.");
        if (!active) return;
        const { data: items, error: fError } = await supabase.from("portal_fragments")
          .select("*").eq("portal_id", p.id).eq("visible", true).order("position");
        if (fError) throw fError;
        if (active) {
          setPortal(p);
          setFragments(items ?? []);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [slug, reloadKey]);

  return <div className={magicWorld ? "portal-world portal-inspiration-page min-h-screen" : "portal-world min-h-screen"} style={{
    ["--portal-bg" as string]: "#111d19",
    ["--portal-surface" as string]: "#203128",
    ["--portal-text" as string]: "#f7efda",
    ["--portal-accent" as string]: "#d3b575",
    ["--portal-button-text" as string]: "#17251d",
  }}>
    <header className="portal-inspired-header relative isolate mx-auto max-w-5xl overflow-hidden px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
      {magicWorld && <PortalFestiveAccents variant="inspiracoes" />}
      <a href={mainUrl} className="inline-flex items-center gap-2 rounded-full border border-[var(--portal-accent)]/40 px-4 py-2 text-sm text-[var(--portal-text)] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--portal-accent)]">
        <ArrowLeft size={17} aria-hidden="true" /> Voltar ao Portal NFC
      </a>
      <div className="mx-auto max-w-3xl pb-6 pt-12 text-center sm:pt-16">
        <BookOpenText className="mx-auto text-[var(--portal-accent)]" size={30} aria-hidden="true" />
        <p className="mt-5 text-xs uppercase tracking-[.28em] text-[var(--portal-accent)]">Hiraeth · Por trás das chamas</p>
        <h1 className={magicWorld ? "portal-script-title mt-4 text-[var(--portal-text)]" : "mt-4 font-display text-4xl leading-tight text-[var(--portal-text)] sm:text-6xl"}>Conheça as inspirações</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--portal-text)]/85">
          Os detalhes dos livros, dos filmes e das lembranças que transformei em aromas para nos sentirmos mais perto das histórias.
        </p>
      </div>
    </header>

    <main className="mx-auto min-h-[30vh] max-w-5xl px-5 pb-20 sm:px-8">
      {loading ? <p role="status" className="py-10 text-center">Abrindo as páginas desta história...</p>
      : error || !portal ? <div className="portal-inspiration-card mx-auto max-w-xl p-8 text-center">
        <p role="alert">Não foi possível carregar as inspirações. Verifique sua conexão e tente novamente.</p>
        <button type="button" onClick={() => setReloadKey(value => value + 1)}
          className="mt-5 rounded-full border border-[var(--portal-accent)] px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Tentar novamente
        </button>
      </div> : fragments.length ? <PortalInspirationChapters fragments={fragments} magicWorld={magicWorld} /> :
      <div className="portal-inspiration-card mx-auto max-w-xl p-8 text-center">
        <h2 className="portal-story-title text-2xl">As histórias serão reveladas aqui.</h2>
        <p className="mt-3 text-sm opacity-80">Em breve, este espaço reunirá as inspirações da coleção.</p>
      </div>}
      <div className="mt-16 text-center">
        <a href={mainUrl} className="inline-flex items-center gap-2 rounded-full border border-[var(--portal-accent)] px-6 py-3 text-sm text-[var(--portal-text)] hover:bg-white/10">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao mundo da magia
        </a>
      </div>
    </main>
    <p className="pb-8 text-center text-sm italic text-[var(--portal-text)]/80">Hiraeth — Onde a Chama Acesa te Espera</p>
    <SiteFooter />
  </div>;
}
