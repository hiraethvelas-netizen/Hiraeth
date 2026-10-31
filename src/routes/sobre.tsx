import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent, uploadSiteImage, useAdminEdit } from "@/lib/admin-edit";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string };
type AboutLink = { label: string; url: string };
type AboutBlock = { id: string; title: string; text: string; layout: "text" | "image-left" | "image-right" | "gallery"; images: string[]; captions?: string[]; links: AboutLink[] };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "" };
const storyBlocks: AboutBlock[] = [{"id":"origem-hiraeth","title":"Toda história tem um começo. A nossa nasceu entre livros e aromas.","text":"A Hiraeth nasceu em 2021, em meio à pandemia, de uma paixão que sempre fez parte de mim: os livros, as histórias e os universos que encontramos dentro deles.\n\nNaquela época, eu passava boa parte dos meus dias lendo e assistindo às minhas histórias favoritas. Comecei a imaginar como seria transformar um pouco daquela sensação em algo que pudesse ser sentido de verdade.\n\nA memória olfativa tem uma capacidade especial de despertar lembranças, sentimentos e sensações. Um aroma pode nos transportar para um lugar, uma época ou até mesmo para uma história que marcou nossa vida. Foi dessa ideia que nasceu a Hiraeth: da vontade de criar velas capazes de transportar pessoas para seus universos favoritos, transformando histórias em experiências sensoriais.","layout":"image-right","images":[],"links":[]},{"id":"primeira-colecao","title":"Nossa primeira história foi escrita em um universo mágico.","text":"Minha primeira grande inspiração veio de Harry Potter, um universo que fazia parte dos meus dias e despertava em mim uma vontade enorme de criar. Assim nasceu a primeira coleção da Hiraeth e, com ela, uma criação que se tornaria um dos produtos mais marcantes da nossa trajetória: a vela do Chapéu Seletor.\n\nA ideia era criar uma vela que guardasse uma surpresa: conforme a cera derretia, uma cor revelava a casa escolhida. Eu ainda não tinha encontrado algo igual ao que imaginava, então decidi tirar aquela ideia do papel.\n\nE o resultado foi muito maior do que eu esperava. A vela ganhou destaque nas redes sociais e se tornou um dos símbolos da história da Hiraeth.","layout":"image-left","images":[],"links":[]},{"id":"alcance-hiraeth","title":"De uma pequena ideia a milhões de conexões.","text":"Com o crescimento da Hiraeth, vieram novas oportunidades, encontros e parcerias com criadores de conteúdo e influenciadores que também compartilhavam o amor por histórias e universos especiais.\n\nAo longo dessa trajetória, nossas criações apareceram em diversos vídeos e conteúdos nas redes sociais, somando mais de 5 milhões de visualizações. Mais do que números, foram milhares de pessoas descobrindo a Hiraeth, conhecendo nossas criações e compartilhando um pouco desse universo conosco.","layout":"image-right","images":[],"links":[]},{"id":"acervo-criativo","title":"Mais de 300 maneiras de contar uma história.","text":"Houve uma época em que nosso catálogo ultrapassou 300 modelos de velas. Eram centenas de ideias, aromas e referências transformadas em criações, cada uma inspirada por um universo, uma lembrança ou um sentimento.\n\nHoje nosso catálogo é diferente e segue em constante curadoria. Nem todas aquelas criações estão disponíveis atualmente, mas cada uma fez parte da construção da Hiraeth e ajudou a moldar a marca que existe hoje.","layout":"image-left","images":[],"links":[]},{"id":"conheca-mari","title":"Prazer, eu sou a Mari.","text":"Sou a Mari, fundadora da Hiraeth e a pessoa que começou tudo isso a partir de uma paixão por livros, histórias e pela possibilidade de transformar sentimentos em experiências.\n\nA Hiraeth nasceu de uma ideia minha, mas, ao longo dos anos, se tornou muito mais do que uma marca de velas. Cada coleção carrega um pouco das coisas que amo, das histórias que me inspiram e das experiências que quero proporcionar a quem chega até aqui.\n\nAcredito que uma vela pode ser muito mais do que um objeto decorativo. Ela pode acompanhar uma leitura, marcar um momento, despertar uma lembrança e fazer alguém se sentir dentro de uma história. E é isso que continuo querendo criar.\n\nCom carinho, Mari.","layout":"image-right","images":[],"links":[]},{"id":"novo-capitulo","title":"Mudamos muitas vezes. Nossa essência permaneceu.","text":"Desde 2021, a Hiraeth passou por muitas transformações. Mudamos nossa identidade visual, nossa forma de criar, nossa cidade e até a maneira como enxergávamos o futuro da marca. Vivemos diferentes fases, experimentamos novos caminhos e aprendemos muito ao longo dessa jornada.\n\nMas algumas coisas nunca mudaram: o amor pelas histórias, o cuidado com cada criação e a vontade de proporcionar experiências que despertem sentimentos.\n\nHoje, a Hiraeth inicia um novo capítulo. Um renascimento que não apaga o que fomos, mas abraça tudo o que nos tornamos. Uma marca mais madura, com novos projetos, novas experiências e a mesma essência que deu origem a tudo.\n\nAlgumas histórias merecem ser contadas novamente. E algumas chamas sempre encontram uma maneira de continuar acesas.","layout":"text","images":[],"links":[]}];
const seedBlocks = (_p: Profile): AboutBlock[] => storyBlocks;
export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }, { property: "og:title", content: "Sobre a Hiraeth" }, { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sobre,
});

function CaptionInlineEditor({ caption, onSave }: { caption: string; onSave: (caption: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(caption);
  const [saving, setSaving] = useState(false);
  if (!open) return <button type="button" onClick={() => { setValue(caption); setOpen(true); }} className="relative z-10 w-full rounded border border-[#8b7b5d] bg-[#f7efda] px-2 py-2 text-[11px] font-semibold text-[#263126] shadow-sm">Editar legenda</button>;
  return <div className="relative z-20 space-y-2 rounded border border-[#8b7b5d] bg-[#f7efda] p-2 text-left text-[#263126]">
    <label className="block text-[11px] font-semibold">Legenda da foto
      <input autoFocus value={value} onChange={event => setValue(event.target.value)} className="mt-1 w-full min-w-0 border border-[#8b7b5d] bg-[#f7efda] px-2 py-2 text-sm text-[#263126]" placeholder="Digite a legenda..." />
    </label>
    <div className="flex gap-2">
      <button type="button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave(value); setOpen(false); } catch (error) { window.alert("Não foi possível salvar a legenda: " + (error instanceof Error ? error.message : "erro desconhecido")); } finally { setSaving(false); } }} className="rounded bg-[#263126] px-3 py-2 text-[11px] font-semibold text-[#f7efda] disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
      <button type="button" onClick={() => setOpen(false)} className="rounded border border-[#8b7b5d] px-3 py-2 text-[11px]">Cancelar</button>
    </div>
  </div>;
}

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
    {editing && <InlineEditor label="cabeçalho de Conheça a Hiraeth" fields={[{ name: "eyebrow", label: "Texto pequeno acima do título", type: "text" }, { name: "title", label: "Título da página", type: "text" }, { name: "closing", label: "Frase de encerramento", type: "text" }]} values={pageSettings} onSave={async (next) => savePageSettings({ ...pageSettings, ...next } as typeof pageSettings)} />}
    <div className="space-y-10 sm:space-y-16">
      {bannerSettings.enabled && bannerSettings.image_url && <a href={bannerSettings.href || "/loja"} target={/^(https?:)?\/\//i.test(bannerSettings.href) ? "_blank" : undefined} rel={/^(https?:)?\/\//i.test(bannerSettings.href) ? "noreferrer" : undefined} className="block overflow-hidden"><img src={bannerSettings.image_url} alt={bannerSettings.title || "Banner Hiraeth"} className="max-h-[28rem] w-full object-cover" /></a>}
      <section className="px-2 py-8 text-foreground sm:px-6 sm:py-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.24em] text-primary">Um pouco da nossa história</p>
        <h2 className="max-w-3xl font-serif text-4xl font-medium leading-[1.08] tracking-tight text-foreground sm:text-6xl">Algumas histórias merecem ser <span className="font-bold italic">sentidas.</span></h2>
        <p className="mt-5 max-w-2xl font-serif text-base leading-relaxed text-foreground/85 sm:text-xl">Cada criação guarda uma lembrança, cada aroma abre uma passagem e cada detalhe faz parte de quem somos.</p>
      </section>
      <section className="relative overflow-hidden rounded-sm border border-[#b6a77f]/40 bg-[#314333] px-6 py-9 text-[#f5efdf] dark:bg-[#f7efda] dark:text-[#5b1d04] sm:px-12 sm:py-12">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#d5c28b] dark:text-[#927b45]">A palavra por trás da chama</p>
        <h2 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">O que significa <span className="font-bold italic">Hiraeth?</span></h2>
        <p className="mt-5 max-w-3xl font-serif text-base leading-[1.9] sm:text-lg">De origem galesa, <em>Hiraeth</em> representa a saudade de um lugar, pessoa ou época que talvez nunca tenha existido — ou ao qual já não podemos voltar.</p>
        <p className="mt-4 max-w-3xl font-serif text-base leading-[1.9] sm:text-lg">É também a saudade que sentimos ao terminar um livro ou uma série e perceber que ainda gostaríamos de permanecer naquele universo.</p>
        <p className="mt-4 max-w-3xl font-serif text-base leading-[1.9] sm:text-lg">Escolhi esse nome porque quero que a Hiraeth seja uma forma de reencontrar esses mundos. Por meio de aromas e experiências, queremos trazer um pouco das histórias que você ama para perto — e prolongar a magia de cada uma delas.</p>
      </section>
      {shownBlocks.map((block, index) => {
        const isFeatureBlock = index % 2 === 0;
        const palette = isFeatureBlock
          ? { bg: "bg-[#314333] dark:bg-[#f7efda]", ink: "text-[#f5efdf] dark:text-[#5b1d04]", accent: "text-[#d5c28b] dark:text-[#927b45]" }
          : { bg: "bg-transparent", ink: "text-foreground", accent: "text-primary" };
        return <section key={block.id || index} className={`overflow-hidden rounded-sm ${palette.bg} ${palette.ink} ${isFeatureBlock ? "shadow-sm" : ""}`}>
          <div className="grid gap-6 px-5 py-7 sm:gap-9 sm:px-10 sm:py-11 md:grid-cols-[minmax(0,1fr)_minmax(220px,.82fr)] md:items-center">
            <div className="min-w-0">
              <p className={`mb-3 text-[10px] font-semibold uppercase tracking-[.22em] ${palette.accent}`}>Capítulo {String(index + 1).padStart(2, "0")} · Hiraeth</p>
              <h2 className="mb-5 font-serif text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl">{block.title}</h2>
              <p className="whitespace-pre-line font-serif text-base leading-[1.85] sm:text-lg">{block.text}</p>
            </div>
            {block.images?.length > 0 && <div className="flex flex-wrap items-center justify-center gap-4 py-2 sm:gap-5">
              {block.images.map((url, photoIndex) => {
                const isPolaroid = (index + photoIndex) % 3 !== 1;
                return isPolaroid
                  ? <figure key={url + photoIndex} className={`w-[clamp(112px,34vw,172px)] shrink-0 border-[7px] border-b-[34px] border-[#f7efda] bg-[#f7efda] p-1 shadow-[0_8px_22px_rgba(45,35,20,.18)] sm:border-[9px] sm:border-b-[38px] ${photoIndex % 2 === 0 ? "-rotate-2" : "rotate-2"}`}>
                      <img src={url} alt={`Registro ${photoIndex + 1} da história da Hiraeth`} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                      <figcaption className="mt-1 min-h-4 truncate text-center font-serif text-[10px] italic text-[#554b3d] sm:text-xs">{block.captions?.[photoIndex] || ""}</figcaption>
                      {editing && <div className="mt-2 space-y-1">
                        <CaptionInlineEditor caption={block.captions?.[photoIndex] ?? ""} onSave={async (caption) => {
                          const captions = [...(block.captions ?? [])];
                          captions[photoIndex] = caption;
                          const updated = shownBlocks.map((item, i) => i === index ? { ...item, captions } : item);
                          const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
                          if (error) throw error;
                          setBlocks(updated);
                        }} />
                        <button type="button" onClick={() => void removeStoryPhoto(index, photoIndex)} className="w-full text-[10px] text-red-700">Remover foto</button>
                      </div>}
                    </figure>
                  : <figure key={url + photoIndex} className="w-full max-w-[290px] overflow-hidden bg-[#f7efda] p-2 shadow-md">
                      <img src={url} alt={`Registro ${photoIndex + 1} da história da Hiraeth`} className="aspect-[5/4] w-full object-cover" loading="lazy" />
                      <figcaption className="px-2 py-2 font-serif text-xs italic text-[#554b3d]">{block.captions?.[photoIndex] || ""}</figcaption>
                      {editing && <div className="space-y-1 px-2 pb-2">
                        <CaptionInlineEditor caption={block.captions?.[photoIndex] ?? ""} onSave={async (caption) => {
                          const captions = [...(block.captions ?? [])];
                          captions[photoIndex] = caption;
                          const updated = shownBlocks.map((item, i) => i === index ? { ...item, captions } : item);
                          const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
                          if (error) throw error;
                          setBlocks(updated);
                        }} />
                        <button type="button" onClick={() => void removeStoryPhoto(index, photoIndex)} className="text-[10px] text-red-700">Remover foto</button>
                      </div>}
                    </figure>;
              })}
            </div>}
          </div>
          {editing && <div className="space-y-3 border-t border-black/10 px-5 py-4 sm:px-10">
            <label htmlFor={`story-polaroid-upload-${block.id}`} className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-current/30 px-4 py-2 text-sm font-semibold">＋ Adicionar fotos a este capítulo</label>
            <input id={`story-polaroid-upload-${block.id}`} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { void addStoryPhotos(index, event.currentTarget.files); event.currentTarget.value = ""; }} />
            <span className="ml-3 text-xs opacity-70">JPG, PNG ou WebP · até 5 MB por foto</span>
            <InlineEditor label={`Editar texto de ${block.title || "bloco da história"}`} fields={[{ name: "title", label: "Título do bloco", type: "text" }, { name: "text", label: "Texto do bloco", type: "textarea" }]} values={{ title: block.title, text: block.text }} onSave={async (edited) => {
              const updated = shownBlocks.map((item, i) => i === index ? { ...item, title: String(edited["title"] ?? ""), text: String(edited["text"] ?? "") } : item);
              const { error } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks: updated }, updated_at: new Date().toISOString() }, { onConflict: "key" });
              if (error) throw error;
              setBlocks(updated);
            }} />
          </div>}
        </section>;
      })}
      <p className="border-t border-[#a99b7b]/40 pt-7 text-center font-serif text-xl italic text-primary sm:text-2xl">{pageSettings.closing}</p>
    </div>
  </PageShell>;
}
