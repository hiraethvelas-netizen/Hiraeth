import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent, uploadSiteImage, useAdminEdit } from "@/lib/admin-edit";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string };
type AboutLink = { label: string; url: string };
type AboutBlock = { id: string; title: string; text: string; layout: "text" | "image-left" | "image-right" | "gallery"; images: string[]; links: AboutLink[] };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "" };
const storyBlocks: AboutBlock[] = [{"id":"origem-hiraeth","title":"Toda história tem um começo. A nossa nasceu entre livros e aromas.","text":"A Hiraeth nasceu em 2021, em meio à pandemia, de uma paixão que sempre fez parte de mim: os livros, as histórias e os universos que encontramos dentro deles.\n\nNaquela época, eu passava boa parte dos meus dias lendo e assistindo às minhas histórias favoritas. Comecei a imaginar como seria transformar um pouco daquela sensação em algo que pudesse ser sentido de verdade.\n\nA memória olfativa tem uma capacidade especial de despertar lembranças, sentimentos e sensações. Um aroma pode nos transportar para um lugar, uma época ou até mesmo para uma história que marcou nossa vida. Foi dessa ideia que nasceu a Hiraeth: da vontade de criar velas capazes de transportar pessoas para seus universos favoritos, transformando histórias em experiências sensoriais.","layout":"image-right","images":[],"links":[]},{"id":"primeira-colecao","title":"Nossa primeira história foi escrita em um universo mágico.","text":"Minha primeira grande inspiração veio de Harry Potter, um universo que fazia parte dos meus dias e despertava em mim uma vontade enorme de criar. Assim nasceu a primeira coleção da Hiraeth e, com ela, uma criação que se tornaria um dos produtos mais marcantes da nossa trajetória: a vela do Chapéu Seletor.\n\nA ideia era criar uma vela que guardasse uma surpresa: conforme a cera derretia, uma cor revelava a casa escolhida. Eu ainda não tinha encontrado algo igual ao que imaginava, então decidi tirar aquela ideia do papel.\n\nE o resultado foi muito maior do que eu esperava. A vela ganhou destaque nas redes sociais e se tornou um dos símbolos da história da Hiraeth.","layout":"image-left","images":[],"links":[]},{"id":"alcance-hiraeth","title":"De uma pequena ideia a milhões de conexões.","text":"Com o crescimento da Hiraeth, vieram novas oportunidades, encontros e parcerias com criadores de conteúdo e influenciadores que também compartilhavam o amor por histórias e universos especiais.\n\nAo longo dessa trajetória, nossas criações apareceram em diversos vídeos e conteúdos nas redes sociais, somando mais de 5 milhões de visualizações. Mais do que números, foram milhares de pessoas descobrindo a Hiraeth, conhecendo nossas criações e compartilhando um pouco desse universo conosco.","layout":"image-right","images":[],"links":[]},{"id":"acervo-criativo","title":"Mais de 300 maneiras de contar uma história.","text":"Houve uma época em que nosso catálogo ultrapassou 300 modelos de velas. Eram centenas de ideias, aromas e referências transformadas em criações, cada uma inspirada por um universo, uma lembrança ou um sentimento.\n\nHoje nosso catálogo é diferente e segue em constante curadoria. Nem todas aquelas criações estão disponíveis atualmente, mas cada uma fez parte da construção da Hiraeth e ajudou a moldar a marca que existe hoje.","layout":"image-left","images":[],"links":[]},{"id":"conheca-mari","title":"Prazer, eu sou a Mari.","text":"Sou a Mari, fundadora da Hiraeth e a pessoa que começou tudo isso a partir de uma paixão por livros, histórias e pela possibilidade de transformar sentimentos em experiências.\n\nA Hiraeth nasceu de uma ideia minha, mas, ao longo dos anos, se tornou muito mais do que uma marca de velas. Cada coleção carrega um pouco das coisas que amo, das histórias que me inspiram e das experiências que quero proporcionar a quem chega até aqui.\n\nAcredito que uma vela pode ser muito mais do que um objeto decorativo. Ela pode acompanhar uma leitura, marcar um momento, despertar uma lembrança e fazer alguém se sentir dentro de uma história. E é isso que continuo querendo criar.\n\nCom carinho, Mari.","layout":"image-right","images":[],"links":[]},{"id":"novo-capitulo","title":"Mudamos muitas vezes. Nossa essência permaneceu.","text":"Desde 2021, a Hiraeth passou por muitas transformações. Mudamos nossa identidade visual, nossa forma de criar, nossa cidade e até a maneira como enxergávamos o futuro da marca. Vivemos diferentes fases, experimentamos novos caminhos e aprendemos muito ao longo dessa jornada.\n\nMas algumas coisas nunca mudaram: o amor pelas histórias, o cuidado com cada criação e a vontade de proporcionar experiências que despertem sentimentos.\n\nHoje, a Hiraeth inicia um novo capítulo. Um renascimento que não apaga o que fomos, mas abraça tudo o que nos tornamos. Uma marca mais madura, com novos projetos, novas experiências e a mesma essência que deu origem a tudo.\n\nAlgumas histórias merecem ser contadas novamente. E algumas chamas sempre encontram uma maneira de continuar acesas.","layout":"text","images":[],"links":[]}];
const seedBlocks = (_p: Profile): AboutBlock[] => storyBlocks;
export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }, { property: "og:title", content: "Sobre a Hiraeth" }, { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sobre,
});
function Sobre() {
  const { editing } = useAdminEdit();
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
      if (content?.value?.version === 2 && Array.isArray(saved) && saved.length) {
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
  async function addStoryPhotos(blockIndex: number, files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) { window.alert(`A imagem "${invalid.name}" precisa ser JPG, PNG ou WebP e ter até 5 MB.`); return; }
    try {
      const urls: string[] = [];
      for (const file of selected) urls.push(await uploadSiteImage(file, "about-story"));
      const updated = shownBlocks.map((item, i) => i === blockIndex ? { ...item, images: [...(item.images ?? []), ...urls] } : item);
      const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      setBlocks(updated);
    } catch (error) {
      window.alert("Não foi possível adicionar as fotos: " + (error instanceof Error ? error.message : "erro desconhecido"));
    }
  }
  async function removeStoryPhoto(blockIndex: number, imageIndex: number) {
    const updated = shownBlocks.map((item, i) => i === blockIndex ? { ...item, images: (item.images ?? []).filter((_, j) => j !== imageIndex) } : item);
    const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { window.alert("Não foi possível salvar a remoção da foto."); return; }
    setBlocks(updated);
  }
  return <PageShell eyebrow={pageSettings.eyebrow} title={pageSettings.title}>
    <div className="space-y-4">
      <InlineEditor label="cabeçalho de Conheça a Hiraeth" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "closing", label: "Frase de encerramento", type: "text" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />
      <p className="text-sm text-muted-foreground">Para editar os textos, blocos, imagens e links da história, use a área administrativa <a href="/admin/sobre" className="text-primary underline">Sobre e contatos</a>.</p>
    </div>
    <div className="space-y-12">
      {bannerSettings.enabled && bannerSettings.image_url && <a href={bannerSettings.href || "/loja"} target={/^(https?:)?\/\//i.test(bannerSettings.href) ? "_blank" : undefined} rel={/^(https?:)?\/\//i.test(bannerSettings.href) ? "noreferrer" : undefined} className="block overflow-hidden"><img src={bannerSettings.image_url} alt={bannerSettings.title || "Banner Hiraeth"} className="max-h-[28rem] w-full object-cover" /></a>}
      {shownBlocks.map((block, index) => <section key={block.id || index} className="space-y-5">
        {editing && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3">
          <label htmlFor={`story-polaroid-upload-${block.id}`} className="inline-flex min-h-10 cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">＋ Adicionar fotos tipo polaroid</label>
          <input id={`story-polaroid-upload-${block.id}`} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { void addStoryPhotos(index, event.currentTarget.files); event.currentTarget.value = ""; }} />
          <span className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB por foto</span>
        </div>}
        <InlineEditor label={`bloco ${block.title || "da história"}`} fields={[{ name: "title", label: "Título do bloco", type: "text" }, { name: "text", label: "Texto do bloco", type: "textarea" }, { name: "layout", label: "Layout", type: "select", options: [{ value: "text", label: "Texto e links" }, { value: "image-left", label: "Imagem à esquerda" }, { value: "image-right", label: "Imagem à direita" }, { value: "gallery", label: "Galeria" }] }]} values={{ title: block.title, text: block.text, layout: block.layout }} onSave={async (next) => {
          const updated = shownBlocks.map((item, i) => i === index ? { ...item, title: String(next["title"] ?? ""), text: String(next["text"] ?? ""), layout: String(next["layout"] ?? item.layout) as AboutBlock["layout"] } : item);
          const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
          if (error) throw error;
          setBlocks(updated);
        }} />
        {block.images?.length >= 2 ? <div className="grid items-center gap-10 md:grid-cols-[1.1fr_.9fr]">
          <div className="relative mx-auto w-full max-w-xl pb-8 pr-5 sm:pb-10 sm:pr-8">
            <figure className="-rotate-2 border-[10px] border-b-[42px] border-white bg-white p-1 shadow-xl"><img src={block.images[0]} alt="Uma lembrança da história da Hiraeth" className="aspect-[4/5] max-h-[38rem] w-full object-cover" />{editing && <button type="button" onClick={() => void removeStoryPhoto(index, 0)} className="mt-2 w-full text-xs text-destructive">Remover foto</button>}</figure>
            <figure className="absolute bottom-0 right-0 w-[42%] max-w-56 rotate-3 border-[10px] border-b-[42px] border-white bg-white p-1 shadow-xl sm:border-[12px] sm:border-b-[50px]">
              <img src={block.images[1]} alt="Mari, criadora da Hiraeth" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-[-34px] text-center font-display text-sm italic tracking-wide text-[#354333] sm:bottom-[-42px] sm:text-base">Com carinho, Mari</figcaption>{editing && <button type="button" onClick={() => void removeStoryPhoto(index, 1)} className="mt-2 w-full text-xs text-destructive">Remover foto</button>}
            </figure>
          </div>
          <div className="space-y-4">
            {block.title && <h2 className="font-display text-3xl text-foreground">{block.title}</h2>}
            {block.text && <p className="whitespace-pre-line leading-8 text-foreground/90">{block.text}</p>}
            {block.links?.length > 0 && <div className="flex flex-wrap gap-3">{block.links.filter(link => link.label && link.url).map((link, i) => <a key={link.url + i} href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined} rel={link.url.startsWith("http") ? "noreferrer" : undefined} className="inline-flex border border-primary px-4 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground">{link.label}</a>)}</div>}
          </div>
        </div> : <div className={block.layout === "image-left" || block.layout === "image-right" ? "grid items-center gap-8 md:grid-cols-2" : "space-y-5"}>
          {block.layout === "image-left" && block.images?.length > 0 && <div className="space-y-3">{block.images.map((url, i) => <img key={url + i} src={url} alt={block.title || "Hiraeth"} className="max-h-[34rem] w-full object-cover" />)}</div>}
          <div className="space-y-4">
            {block.title && <h2 className="font-display text-3xl text-foreground">{block.title}</h2>}
            {block.text && <p className="whitespace-pre-line leading-8 text-foreground/90">{block.text}</p>}
            {block.links?.length > 0 && <div className="flex flex-wrap gap-3">{block.links.filter(link => link.label && link.url).map((link, i) => <a key={link.url + i} href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined} rel={link.url.startsWith("http") ? "noreferrer" : undefined} className="inline-flex border border-primary px-4 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground">{link.label}</a>)}</div>}
          </div>
          {(block.layout === "image-right" || block.layout === "gallery") && block.images?.length > 0 && <div className={block.layout === "gallery" ? "grid grid-cols-2 gap-3 md:grid-cols-3" : "space-y-3"}>{block.images.map((url, i) => <img key={url + i} src={url} alt={block.title || "Hiraeth"} className={block.layout === "gallery" ? "aspect-[4/5] w-full border-[9px] border-b-[34px] border-white bg-white p-1 object-cover shadow-xl" : "max-h-[34rem] w-full border-[10px] border-b-[38px] border-white bg-white p-1 object-cover shadow-xl"} />)}</div>}
        </div>}
      </section>)}
      <p className="border-t pt-6 italic text-primary">{pageSettings.closing}</p>
    </div>
  </PageShell>;
}
