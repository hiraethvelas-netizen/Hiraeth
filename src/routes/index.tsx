import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import banner from "@/assets/banner-portal.png";
import fenix from "@/assets/fenix.png";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CinematicOpening } from "@/components/CinematicOpening";
import { ShortcutIcon } from "@/components/ShortcutIcon";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";

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

type HomeContent = Record<string, unknown> & {
  portalsEyebrow: string;
  portalsTitle: string;
  bannersTitle: string;
  careEyebrow: string;
  careTitle: string;
  careDescription: string;
  careButton: string;
  careImage: string;
  featuredBannerImage: string;
  featuredBannerHref: string;
  showPortals: boolean;
  showBanners: boolean;
  showCare: boolean;
  sectionOrder: string;
  fontStyle: string;
};

const DEFAULT_HOME_CONTENT: HomeContent = {
  portalsEyebrow: "Portais — Velas literárias",
  portalsTitle: "Escolha seu próximo portal",
  bannersTitle: "Novidades do Círculo",
  careEyebrow: "Para a chama durar",
  careTitle: "Cuidados com as velas",
  careDescription: "Alguns cuidados simples ajudam sua vela a queimar por igual, preservar o aroma e acompanhar seus momentos com segurança.",
  careButton: "Ver cuidados",
  careImage: "",
  featuredBannerImage: "",
  featuredBannerHref: "/loja",
  showPortals: true,
  showBanners: false,
  showCare: true,
  sectionOrder: "portals,care",
  fontStyle: "display",
};

const HOME_FIELDS = [
  { name: "portalsEyebrow", label: "Texto pequeno do topo", type: "text" },
  { name: "portalsTitle", label: "Título principal", type: "text" },
  { name: "bannersTitle", label: "Título da seção de novidades", type: "text" },
  { name: "featuredBannerImage", label: "Imagem do banner principal de novidades", type: "image", help: "Envie a imagem que deve ocupar toda a largura no celular." },
  { name: "featuredBannerHref", label: "Link do banner principal de novidades", type: "text" },
  { name: "careEyebrow", label: "Texto pequeno da seção de cuidados", type: "text" },
  { name: "careTitle", label: "Título da seção de cuidados", type: "text" },
  { name: "careDescription", label: "Descrição dos cuidados", type: "textarea" },
  { name: "careButton", label: "Texto do botão de cuidados", type: "text" },
  { name: "careImage", label: "Imagem opcional da seção de cuidados", type: "image", help: "JPG, PNG, WebP ou GIF, até 10 MB." },
  { name: "fontStyle", label: "Estilo tipográfico dos títulos", type: "select", options: [
    { value: "display", label: "Literário (padrão Hiraeth)" },
    { value: "serif", label: "Serifado clássico" },
    { value: "sans", label: "Sem serifa" },
  ] },
  { name: "sectionOrder", label: "Ordem das seções", type: "select", options: [
    { value: "portals,banners,care", label: "Portais → Novidades → Cuidados" },
    { value: "banners,portals,care", label: "Novidades → Portais → Cuidados" },
    { value: "care,portals,banners", label: "Cuidados → Portais → Novidades" },
    { value: "portals,care,banners", label: "Portais → Cuidados → Novidades" },
    { value: "banners,care,portals", label: "Novidades → Cuidados → Portais" },
    { value: "care,banners,portals", label: "Cuidados → Novidades → Portais" },
  ] },
  { name: "showPortals", label: "Exibir seção de portais", type: "checkbox" },
  { name: "showBanners", label: "Exibir seção de novidades", type: "checkbox" },
  { name: "showCare", label: "Exibir seção de cuidados", type: "checkbox" },
] as const;

export function ExistingHomepage() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const { isAdmin, editMode } = useAdminEdit();
  const [content, saveContent] = useSiteContent<HomeContent>("homepage", DEFAULT_HOME_CONTENT);
  useEffect(() => {
    (supabase as any).from("site_shortcuts").select("*").eq("active", true).order("position")
      .then(({ data }: { data: Shortcut[] | null }) => {
        const existing = data ?? [];
        const additions: Shortcut[] = [
          { id: "builtin-community", title: "Círculo do Fogo", description: "Nossa comunidade", href: "/comunidade", image_key: "phoenix", position: 90, active: true },
          { id: "builtin-book-club", title: "Clube do Livro", description: "Leituras que nos conectam", href: "/clube-do-livro", image_key: "book", position: 91, active: true },
        ].filter(item => !existing.some(current => current.href === item.href));
        setShortcuts([...existing, ...additions]);
      });
    (supabase as any).from("site_banners").select("*").eq("active", true).order("position")
      .then(({ data }: { data: HomeBanner[] | null }) => setBanners(data ?? []));
  }, []);

  async function saveShortcut(id: string, values: Record<string, unknown>) {
    const { error } = await (supabase as any).from("site_shortcuts").update({
      title: String(values["title"] ?? ""),
      description: String(values["description"] ?? "").trim() || null,
      href: String(values["href"] ?? "/loja"),
      image_key: String(values["image_key"] ?? "portal"),
    }).eq("id", id);
    if (error) throw error;
    const { data, error: loadError } = await (supabase as any).from("site_shortcuts").select("*").eq("active", true).order("position");
    if (loadError) throw loadError;
    setShortcuts(data ?? []);
  }

  const headingFont = content.fontStyle === "serif" ? "font-serif" : content.fontStyle === "sans" ? "font-sans" : "font-display";
  const sections: Record<string, ReactNode> = {
    portals: content.showPortals && (
      <section key="portals" className="hiraeth-home-portals relative mx-auto max-w-6xl px-5 pb-12 pt-12 text-center md:pb-16 md:pt-20">
        <p className="eyebrow hiraeth-reveal relative z-10">{content.portalsEyebrow}</p>
        <h1 className="hiraeth-editorial-title hiraeth-reveal relative z-10 mt-4">{content.portalsTitle}</h1>
        <div className="hiraeth-ornament relative z-10" aria-hidden="true"><span>·</span></div>
        <div className="relative z-10 mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-x-5 gap-y-8">
          {(shortcuts.length ? shortcuts : [
            { id: "default-about", title: "Conheça a Hiraeth", description: "Conheça nossa história", href: "/sobre", image_key: "hiraeth", position: 1, active: true },
            { id: "default-store", title: "Nossa Loja", description: "Velas e camisetas literárias", href: "/loja", image_key: "candle", position: 2, active: true },
            { id: "default-library", title: "Seu próximo portal", description: "Volte ao Círculo do Fogo", href: "/inicio", image_key: "portal", position: 3, active: true },
            { id: "default-care", title: "Cuidados", description: "Cuidados com suas velas", href: "/cuidados", image_key: "book", position: 4, active: true },
          ] as Shortcut[]).map((item) => (
            <div key={item.id} className="hiraeth-reveal group flex flex-col items-center gap-3 text-center">
              <span className="hiraeth-collection-card block aspect-square w-full max-w-40 overflow-hidden rounded-full bg-card p-1.5">
                <ShortcutIcon imageKey={item.image_key} title={item.title} />
              </span>
              <span className={`hiraeth-collection-label text-foreground ${headingFont}`}>{item.title}</span>
              {item.description && <span className="max-w-40 text-sm text-muted-foreground">{item.description}</span>}
              <Link to={item.href as never} className="text-xs text-primary underline-offset-4 hover:underline">Explorar</Link>
              {!item.id.startsWith("default-") && <InlineEditor label={`atalho ${item.title}`} fields={[
                { name: "title", label: "Título", type: "text" },
                { name: "description", label: "Descrição", type: "text" },
                { name: "href", label: "Link de destino", type: "text" },
                { name: "image_key", label: "Imagem da bolinha", type: "image", help: "JPG, PNG ou WebP, até 5 MB." },
              ]} values={{ title: item.title, description: item.description ?? "", href: item.href, image_key: item.image_key }} onSave={(next) => saveShortcut(item.id, next)} />}
            </div>
          ))}

        </div>
      </section>
    ),
    banners: false && content.showBanners && (
      <section key="banners" className="w-full py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-5"><h2 className={`text-3xl text-foreground md:text-4xl ${headingFont}`}>{content.bannersTitle}</h2></div>
        <div className="mt-6 flex snap-x gap-0 overflow-x-auto pb-4 sm:gap-5 sm:px-5">
          {(banners.length ? banners : [{ id: "fallback", title: "Explore os universos literários da Hiraeth", image_url: content.featuredBannerImage || banner, href: content.featuredBannerHref || "/loja", position: 1, active: true }]).map((item) => (
            <div key={item.id} className={item.id === "fallback" ? "w-full min-w-full snap-start overflow-hidden sm:w-[60%] sm:min-w-[60%] md:w-[48%] md:min-w-[48%]" : "w-full min-w-full snap-start overflow-hidden rounded-sm sm:w-[60%] sm:min-w-[60%] md:w-[48%] md:min-w-[48%]"}>
              <Link to={item.href as never} className="group block overflow-hidden rounded-sm">
                <img src={item.image_url} alt={item.title || "Novidade Hiraeth"} className="h-auto max-h-[70vh] min-h-[18rem] w-full object-cover transition-transform duration-500 group-hover:scale-[1.01] sm:h-64 md:h-80" loading="lazy" />
                {item.title && <span className="sr-only">{item.title}</span>}
              </Link>
              {item.id === "fallback" ? <InlineEditor label="banner principal de novidades" fields={[{ name: "featuredBannerImage", label: "Imagem do banner", type: "image" }, { name: "featuredBannerHref", label: "Link de destino", type: "text" }]} values={{ featuredBannerImage: content.featuredBannerImage || "", featuredBannerHref: content.featuredBannerHref || "/loja" }} onSave={async values => saveContent({ ...mergedContent, featuredBannerImage: String(values["featuredBannerImage"] || ""), featuredBannerHref: String(values["featuredBannerHref"] || "/loja") } as HomeContent)} className="mx-auto max-w-6xl px-5 mt-3" /> : <InlineEditor label={`novidade ${item.title || ""}`} fields={[
                { name: "title", label: "Título", type: "text" },
                { name: "image_url", label: "Imagem do banner", type: "image" },
                { name: "href", label: "Link de destino", type: "text" },
              ]} values={{ title: item.title ?? "", image_url: item.image_url, href: item.href }} onSave={async (values) => {
                const { error } = await (supabase as any).from("site_banners").update({ title: String(values["title"] ?? "") || null, image_url: String(values["image_url"] ?? item.image_url), href: String(values["href"] ?? item.href) }).eq("id", item.id);
                if (error) throw error;
                setBanners(current => current.map(b => b.id === item.id ? { ...b, title: String(values["title"] ?? "") || null, image_url: String(values["image_url"] ?? item.image_url), href: String(values["href"] ?? item.href) } : b));
              }} className="mt-3" />}
            </div>
          ))}
        </div>
      </section>
    ),
    care: content.showCare && (
      <section key="care" className="hiraeth-care-atmosphere relative overflow-hidden px-5 py-12 md:px-8 md:py-20">
        <img src={fenix} alt="" aria-hidden="true" className="hiraeth-care-phoenix pointer-events-none absolute right-[-5%] top-1/2 hidden h-[min(34rem,85%)] w-auto -translate-y-1/2 object-contain md:block" />
        <div className="hiraeth-care-panel hiraeth-reveal relative z-10 mx-auto flex max-w-3xl flex-col justify-center px-6 py-10 text-center sm:px-10 md:px-16 md:py-14">
            <p className="eyebrow">{content.careEyebrow}</p>
            <h2 className={`mt-4 text-4xl leading-[1.02] sm:text-5xl ${headingFont}`}>{content.careTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-foreground">{content.careDescription}</p>
            <div className="hiraeth-ornament hiraeth-ornament--flame hiraeth-ornament--wide" aria-hidden="true"><span>🔥</span></div>
            {typeof content.careImage === "string" && content.careImage && <img src={content.careImage} alt="" className="mx-auto mt-6 max-h-72 max-w-full object-cover" />}
            <div><Link to="/cuidados" className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-6 py-3 font-display text-lg text-primary-foreground transition-transform hover:-translate-y-0.5">{content.careButton}<span aria-hidden="true">＋</span></Link></div>
        </div>
      </section>
    ),

  };

  const order = content.sectionOrder.split(",").filter((key) => key in sections);
  const orderedKeys = ["portals", "care"].filter((key) => key in sections);
  const mergedContent = { ...DEFAULT_HOME_CONTENT, ...content } as HomeContent;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {isAdmin && <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pt-3">
          <Link to="/admin" className="inline-flex items-center gap-2 border border-primary/50 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10">
            ← Voltar ao dashboard
          </Link>
          {editMode && <InlineEditor
            label="conteúdo da página inicial"
            fields={[...HOME_FIELDS]}
            values={mergedContent}
            onSave={async (next) => saveContent({ ...mergedContent, ...next } as HomeContent)}
          />}
        </div>}
        {orderedKeys.map((key) => sections[key])}
      </main>
      <SiteFooter />
    </div>
  );
}
