import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import banner from "@/assets/banner-portal.png";
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
  showPortals: boolean;
  showBanners: boolean;
  showCare: boolean;
  sectionOrder: string;
  fontStyle: string;
};

const DEFAULT_HOME_CONTENT: HomeContent = {
  portalsEyebrow: "Bem-vindo ao Círculo do Fogo",
  portalsTitle: "Escolha seu próximo portal",
  bannersTitle: "Novidades do Círculo",
  careEyebrow: "Para a chama durar",
  careTitle: "Cuidados com as velas",
  careDescription: "Pequenos rituais que fazem sua vela queimar por igual, com segurança e por mais tempo.",
  careButton: "Ver cuidados",
  careImage: "",
  showPortals: true,
  showBanners: true,
  showCare: true,
  sectionOrder: "portals,banners,care",
  fontStyle: "display",
};

const HOME_FIELDS = [
  { name: "portalsEyebrow", label: "Texto pequeno do topo", type: "text" },
  { name: "portalsTitle", label: "Título principal", type: "text" },
  { name: "bannersTitle", label: "Título da seção de novidades", type: "text" },
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
  const { isAdmin, editMode, toggle } = useAdminEdit();
  const [content, saveContent] = useSiteContent<HomeContent>("homepage", DEFAULT_HOME_CONTENT);
  useEffect(() => {
    (supabase as any).from("site_shortcuts").select("*").eq("active", true).order("position")
      .then(({ data }: { data: Shortcut[] | null }) => setShortcuts(data ?? []));
    (supabase as any).from("site_banners").select("*").eq("active", true).order("position")
      .then(({ data }: { data: HomeBanner[] | null }) => setBanners(data ?? []));
  }, []);

  async function saveShortcut(id: string, values: Record<string, unknown>) {
    const { error } = await (supabase as any).from("site_shortcuts").update({
      title: String(values.title ?? ""),
      description: String(values.description ?? "").trim() || null,
      href: String(values.href ?? "/loja"),
      image_key: String(values.image_key ?? "portal"),
    }).eq("id", id);
    if (error) throw error;
    const { data, error: loadError } = await (supabase as any).from("site_shortcuts").select("*").eq("active", true).order("position");
    if (loadError) throw loadError;
    setShortcuts(data ?? []);
  }

  const headingFont = content.fontStyle === "serif" ? "font-serif" : content.fontStyle === "sans" ? "font-sans" : "font-display";
  const sections: Record<string, ReactNode> = {
    portals: content.showPortals && (
      <section key="portals" className="mx-auto max-w-6xl px-5 pb-8 pt-10 text-center md:pt-14">
        <p className="eyebrow">{content.portalsEyebrow}</p>
        <h1 className={`mt-2 text-4xl text-foreground md:text-5xl ${headingFont}`}>{content.portalsTitle}</h1>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {shortcuts.map((item) => (
            <div key={item.id} className="flex flex-col items-center gap-2 text-center">
              <span className="block aspect-square w-full max-w-40 overflow-hidden rounded-full border border-primary/40 bg-card p-1 transition-transform group-hover:scale-105">
                <ShortcutIcon imageKey={item.image_key} title={item.title} />
              </span>
              <span className={`text-xl text-foreground ${headingFont}`}>{item.title}</span>
              {item.description && <span className="max-w-40 text-sm text-muted-foreground">{item.description}</span>}
              <Link to={item.href as never} className="text-xs text-primary underline-offset-4 hover:underline">Explorar</Link>
              <InlineEditor label={`atalho ${item.title}`} fields={[
                { name: "title", label: "Título", type: "text" },
                { name: "description", label: "Descrição", type: "text" },
                { name: "href", label: "Link de destino", type: "text" },
                { name: "image_key", label: "Imagem da bolinha", type: "image", help: "JPG, PNG ou WebP, até 5 MB." },
              ]} values={{ title: item.title, description: item.description ?? "", href: item.href, image_key: item.image_key }} onSave={(next) => saveShortcut(item.id, next)} />
            </div>
          ))}
          {shortcuts.length === 0 && <Link to="/loja" className="mx-auto flex flex-col items-center gap-3"><span className="flex aspect-square w-36 items-center justify-center rounded-full border border-primary/40 bg-card p-5 text-center font-display text-xl text-foreground">Acessar a Loja</span></Link>}
        </div>
      </section>
    ),
    banners: content.showBanners && (
      <section key="banners" className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        <h2 className={`text-3xl text-foreground md:text-4xl ${headingFont}`}>{content.bannersTitle}</h2>
        <div className="mt-6 flex snap-x gap-5 overflow-x-auto pb-4">
          {(banners.length ? banners : [{ id: "fallback", title: "Explore os universos literários da Hiraeth", image_url: banner, href: "/loja", position: 1, active: true }]).map((item) => (
            <div key={item.id} className="w-full min-w-full snap-start">
              <Link to={item.href as never} className="group block overflow-hidden rounded-sm">
                <img src={item.image_url} alt={item.title || "Novidade Hiraeth"} className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-72 md:h-[28rem] lg:h-[32rem]" loading="lazy" />
                {item.title && <span className="sr-only">{item.title}</span>}
              </Link>
              {item.id !== "fallback" && <InlineEditor label={`novidade ${item.title || ""}`} fields={[
                { name: "title", label: "Título", type: "text" },
                { name: "image_url", label: "Imagem do banner", type: "image" },
                { name: "href", label: "Link de destino", type: "text" },
              ]} values={{ title: item.title ?? "", image_url: item.image_url, href: item.href }} onSave={async (values) => {
                const { error } = await (supabase as any).from("site_banners").update({ title: String(values.title ?? "") || null, image_url: String(values.image_url ?? item.image_url), href: String(values.href ?? item.href) }).eq("id", item.id);
                if (error) throw error;
                setBanners(current => current.map(b => b.id === item.id ? { ...b, title: String(values.title ?? "") || null, image_url: String(values.image_url ?? item.image_url), href: String(values.href ?? item.href) } : b));
              }} className="mt-3" />}
            </div>
          ))}
        </div>
      </section>
    ),
    care: content.showCare && (
      <section key="care" className="border-y bg-card px-6 py-16 text-center">
        <p className="eyebrow">{content.careEyebrow}</p>
        <h2 className={`mt-2 text-4xl text-foreground ${headingFont}`}>{content.careTitle}</h2>
        <p className="mx-auto mt-5 max-w-xl text-foreground/85">{content.careDescription}</p>
        {typeof content.careImage === "string" && content.careImage && <img src={content.careImage} alt="" className="mx-auto mt-6 max-h-72 max-w-full object-cover" />}
        <Link to="/cuidados" className="btn-gold mt-8">{content.careButton}</Link>
      </section>
    ),
  };

  const order = content.sectionOrder.split(",").filter((key) => key in sections);
  const orderedKeys = [...order, ...["portals", "banners", "care"].filter((key) => !order.includes(key))];
  const mergedContent = { ...DEFAULT_HOME_CONTENT, ...content } as HomeContent;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {isAdmin && <div className="mx-auto flex max-w-6xl justify-end gap-3 px-5 pt-3">
          <Link to="/admin" className="border border-primary/60 px-3 py-2 text-xs text-primary hover:bg-primary/10">Abrir dashboard</Link>
          <button type="button" onClick={toggle} aria-pressed={editMode} className="border border-primary px-3 py-2 text-xs text-primary hover:bg-primary/10">{editMode ? "Sair do modo edição" : "Ativar modo edição"}</button>
          <InlineEditor
            label="conteúdo da página inicial"
            fields={[...HOME_FIELDS]}
            values={mergedContent}
            onSave={async (next) => saveContent({ ...mergedContent, ...next } as HomeContent)}
          />
        </div>}
        {orderedKeys.map((key) => sections[key])}
      </main>
      <SiteFooter />
    </div>
  );
}
