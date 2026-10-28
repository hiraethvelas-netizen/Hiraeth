import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string };
type AboutLink = { label: string; url: string };
type AboutBlock = { id: string; title: string; text: string; layout: "text" | "image-left" | "image-right" | "gallery"; images: string[]; links: AboutLink[] };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "" };
const seedBlocks = (p: Profile): AboutBlock[] => [{ id: "historia-hiraeth", title: "Sobre a Hiraeth", text: `${p.about_story}\n\n${p.about_mari}`, layout: "image-right", images: [p.story_image_url, p.about_image_url].filter(Boolean), links: [] }];
export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }, { property: "og:title", content: "Sobre a Hiraeth" }, { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sobre,
});
function Sobre() {
  const [pageSettings, savePageSettings] = useSiteContent("about-page-appearance", { eyebrow: "Nossa história", title: "Sobre a Hiraeth", closing: "Onde a Chama Acesa te Espera" });
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [bannerSettings, setBannerSettings] = useState<{ enabled: boolean; image_url: string; href: string; title: string }>({ enabled: false, image_url: "", href: "/loja", title: "" });
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).from("site_profile").select("*").eq("id", true).maybeSingle();
      const profile = data ? { ...defaults, ...data } : defaults;
      const { data: content } = await (supabase as any).from("site_content").select("value").eq("key", "about_page_blocks").maybeSingle();
      const { data: bannerData } = await (supabase as any).from("site_content").select("value").eq("key", "about_page_settings").maybeSingle();
      const saved = content?.value?.blocks;
      if (Array.isArray(saved) && saved.length) {
        const merged = [...saved] as AboutBlock[];
        const mainIndex = merged.findIndex(block => /hist[oó]ria.*hiraeth|sobre.*hiraeth/i.test(block.title) || block.id === "historia-hiraeth");
        const guardIndex = merged.findIndex(block => block.id === "guardiã-da-chama" || block.id === "guardia-da-chama" || /guardi[aã].*chama|prazer.*mari|sobre.*mari/i.test(block.title));
        if (guardIndex >= 0 && guardIndex !== mainIndex) {
          const guard = merged[guardIndex]!;
          const targetIndex = mainIndex >= 0 ? mainIndex : Math.max(0, merged.findIndex((_, index) => index !== guardIndex));
          const target = merged[targetIndex]!;
          merged[targetIndex] = { ...target, title: "Sobre a Hiraeth", text: [target.text, guard.text].filter(Boolean).join("\n\n"), images: [...(target.images ?? []), ...(guard.images ?? [])], links: [...(target.links ?? []), ...(guard.links ?? [])] };
          merged.splice(guardIndex, 1);
        }
        setBlocks(merged);
      } else setBlocks(seedBlocks(profile));
      setBannerSettings({ enabled: false, image_url: "", href: "/loja", title: "", ...(bannerData?.value ?? {}) });
    })();
  }, []);
  const shownBlocks = blocks.length ? blocks : seedBlocks(defaults);
  return <PageShell eyebrow={pageSettings.eyebrow} title={pageSettings.title}>
    <div className="space-y-4">
      <InlineEditor label="cabeçalho de Conheça a Hiraeth" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "closing", label: "Frase de encerramento", type: "text" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
      <p className="text-sm text-muted-foreground">Para editar os textos, blocos, imagens e links da história, use a área administrativa <a href="/admin/sobre" className="text-primary underline">Sobre e contatos</a>.</p>
    </div>
    <div className="space-y-12">
      {bannerSettings.enabled && bannerSettings.image_url && <a href={bannerSettings.href || "/loja"} target={/^(https?:)?\/\//i.test(bannerSettings.href) ? "_blank" : undefined} rel={/^(https?:)?\/\//i.test(bannerSettings.href) ? "noreferrer" : undefined} className="block overflow-hidden"><img src={bannerSettings.image_url} alt={bannerSettings.title || "Banner Hiraeth"} className="max-h-[28rem] w-full object-cover" /></a>}
      {shownBlocks.map((block, index) => <section key={block.id || index} className="space-y-5">
        <InlineEditor label={`bloco ${block.title || "da história"}`} fields={[{ name: "title", label: "Título do bloco", type: "text" }, { name: "text", label: "Texto do bloco", type: "textarea" }, { name: "layout", label: "Layout", type: "select", options: [{ value: "text", label: "Texto e links" }, { value: "image-left", label: "Imagem à esquerda" }, { value: "image-right", label: "Imagem à direita" }, { value: "gallery", label: "Galeria" }] }]} values={{ title: block.title, text: block.text, layout: block.layout }} onSave={async (next) => {
          const updated = shownBlocks.map((item, i) => i === index ? { ...item, title: String(next["title"] ?? ""), text: String(next["text"] ?? ""), layout: String(next["layout"] ?? item.layout) as AboutBlock["layout"] } : item);
          const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
          if (error) throw error;
          setBlocks(updated);
        }} />
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
      <p className="border-t pt-6 italic text-primary">{pageSettings.closing}</p>
    </div>
  </PageShell>;
}
