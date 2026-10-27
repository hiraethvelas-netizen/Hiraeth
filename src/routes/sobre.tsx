import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string };
type AboutLink = { label: string; url: string };
type AboutBlock = { id: string; title: string; text: string; layout: "text" | "image-left" | "image-right" | "gallery"; images: string[]; links: AboutLink[] };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "" };
const seedBlocks = (p: Profile): AboutBlock[] => [
  { id: "historia-hiraeth", title: "A história da Hiraeth", text: p.about_story, layout: "image-right", images: p.story_image_url ? [p.story_image_url] : [], links: [] },
  { id: "guardia-da-chama", title: "Prazer, eu sou a Mari", text: p.about_mari, layout: "image-left", images: p.about_image_url ? [p.about_image_url] : [], links: [] },
];
export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }, { property: "og:title", content: "Sobre a Hiraeth" }, { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sobre,
});
function Sobre() {
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).from("site_profile").select("*").eq("id", true).maybeSingle();
      const profile = data ? { ...defaults, ...data } : defaults;
      const { data: content } = await (supabase as any).from("site_content").select("value").eq("key", "about_page_blocks").maybeSingle();
      const saved = content?.value?.blocks;
      setBlocks(Array.isArray(saved) && saved.length ? saved : seedBlocks(profile));
    })();
  }, []);
  const shownBlocks = blocks.length ? blocks : seedBlocks(defaults);
  return <PageShell eyebrow="Guardiã da chama" title="Conheça a Hiraeth">
    <div className="space-y-12">
      {shownBlocks.map((block, index) => <section key={block.id || index} className="space-y-5">
        <div className={block.layout === "image-left" || block.layout === "image-right" ? "grid items-center gap-8 md:grid-cols-2" : "space-y-5"}>
          {block.layout === "image-left" && block.images?.length > 0 && <div className="space-y-3">{block.images.map((url, i) => <img key={url + i} src={url} alt={block.title || "Hiraeth"} className="max-h-[34rem] w-full object-cover" />)}</div>}
          <div className="space-y-4">
            {block.title && <h2 className="font-display text-3xl text-foreground">{block.title}</h2>}
            {block.text && <p className="whitespace-pre-line leading-8 text-foreground/90">{block.text}</p>}
            {block.links?.length > 0 && <div className="flex flex-wrap gap-3">{block.links.filter(link => link.label && link.url).map((link, i) => <a key={link.url + i} href={link.url} target={/^https?:\/\//i.test(link.url) ? "_blank" : undefined} rel={/^https?:\/\//i.test(link.url) ? "noreferrer" : undefined} className="inline-flex border border-primary px-4 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground">{link.label}</a>)}</div>}
          </div>
          {(block.layout === "image-right" || block.layout === "gallery") && block.images?.length > 0 && <div className={block.layout === "gallery" ? "grid grid-cols-2 gap-3 md:grid-cols-3" : "space-y-3"}>{block.images.map((url, i) => <img key={url + i} src={url} alt={block.title || "Hiraeth"} className={block.layout === "gallery" ? "aspect-[4/5] w-full object-cover" : "max-h-[34rem] w-full object-cover"} />)}</div>}
        </div>
      </section>)}
      <p className="border-t pt-6 italic text-primary">Onde a Chama Acesa te Espera</p>
    </div>
  </PageShell>;
}
