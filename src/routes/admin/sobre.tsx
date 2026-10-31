import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadSiteImage } from "@/lib/admin-edit";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string; instagram_url: string; whatsapp_number: string; whatsapp_url: string; contact_email: string };
type AboutLink = { label: string; url: string };
type AboutBlock = { id: string; title: string; text: string; layout: "text" | "image-left" | "image-right" | "gallery"; images: string[]; links: AboutLink[] };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "", instagram_url: "", whatsapp_number: "", whatsapp_url: "", contact_email: "" };
const makeId = () => "bloco-" + Math.random().toString(36).slice(2, 10);
const storyBlocks: AboutBlock[] = [{"id":"origem-hiraeth","title":"Toda história tem um começo. A nossa nasceu entre livros e aromas.","text":"A Hiraeth nasceu em 2021, em meio à pandemia, de uma paixão que sempre fez parte de mim: os livros, as histórias e os universos que encontramos dentro deles.\n\nNaquela época, eu passava boa parte dos meus dias lendo e assistindo às minhas histórias favoritas. Comecei a imaginar como seria transformar um pouco daquela sensação em algo que pudesse ser sentido de verdade.\n\nA memória olfativa tem uma capacidade especial de despertar lembranças, sentimentos e sensações. Um aroma pode nos transportar para um lugar, uma época ou até mesmo para uma história que marcou nossa vida. Foi dessa ideia que nasceu a Hiraeth: da vontade de criar velas capazes de transportar pessoas para seus universos favoritos, transformando histórias em experiências sensoriais.","layout":"image-right","images":[],"links":[]},{"id":"primeira-colecao","title":"Nossa primeira história foi escrita em um universo mágico.","text":"Minha primeira grande inspiração veio de Harry Potter, um universo que fazia parte dos meus dias e despertava em mim uma vontade enorme de criar. Assim nasceu a primeira coleção da Hiraeth e, com ela, uma criação que se tornaria um dos produtos mais marcantes da nossa trajetória: a vela do Chapéu Seletor.\n\nA ideia era criar uma vela que guardasse uma surpresa: conforme a cera derretia, uma cor revelava a casa escolhida. Eu ainda não tinha encontrado algo igual ao que imaginava, então decidi tirar aquela ideia do papel.\n\nE o resultado foi muito maior do que eu esperava. A vela ganhou destaque nas redes sociais e se tornou um dos símbolos da história da Hiraeth.","layout":"image-left","images":[],"links":[]},{"id":"alcance-hiraeth","title":"De uma pequena ideia a milhões de conexões.","text":"Com o crescimento da Hiraeth, vieram novas oportunidades, encontros e parcerias com criadores de conteúdo e influenciadores que também compartilhavam o amor por histórias e universos especiais.\n\nAo longo dessa trajetória, nossas criações apareceram em diversos vídeos e conteúdos nas redes sociais, somando mais de 5 milhões de visualizações. Mais do que números, foram milhares de pessoas descobrindo a Hiraeth, conhecendo nossas criações e compartilhando um pouco desse universo conosco.","layout":"image-right","images":[],"links":[]},{"id":"acervo-criativo","title":"Mais de 300 maneiras de contar uma história.","text":"Houve uma época em que nosso catálogo ultrapassou 300 modelos de velas. Eram centenas de ideias, aromas e referências transformadas em criações, cada uma inspirada por um universo, uma lembrança ou um sentimento.\n\nHoje nosso catálogo é diferente e segue em constante curadoria. Nem todas aquelas criações estão disponíveis atualmente, mas cada uma fez parte da construção da Hiraeth e ajudou a moldar a marca que existe hoje.","layout":"image-left","images":[],"links":[]},{"id":"conheca-mari","title":"Prazer, eu sou a Mari.","text":"Sou a Mari, fundadora da Hiraeth e a pessoa que começou tudo isso a partir de uma paixão por livros, histórias e pela possibilidade de transformar sentimentos em experiências.\n\nA Hiraeth nasceu de uma ideia minha, mas, ao longo dos anos, se tornou muito mais do que uma marca de velas. Cada coleção carrega um pouco das coisas que amo, das histórias que me inspiram e das experiências que quero proporcionar a quem chega até aqui.\n\nAcredito que uma vela pode ser muito mais do que um objeto decorativo. Ela pode acompanhar uma leitura, marcar um momento, despertar uma lembrança e fazer alguém se sentir dentro de uma história. E é isso que continuo querendo criar.\n\nCom carinho, Mari.","layout":"image-right","images":[],"links":[]},{"id":"novo-capitulo","title":"Mudamos muitas vezes. Nossa essência permaneceu.","text":"Desde 2021, a Hiraeth passou por muitas transformações. Mudamos nossa identidade visual, nossa forma de criar, nossa cidade e até a maneira como enxergávamos o futuro da marca. Vivemos diferentes fases, experimentamos novos caminhos e aprendemos muito ao longo dessa jornada.\n\nMas algumas coisas nunca mudaram: o amor pelas histórias, o cuidado com cada criação e a vontade de proporcionar experiências que despertem sentimentos.\n\nHoje, a Hiraeth inicia um novo capítulo. Um renascimento que não apaga o que fomos, mas abraça tudo o que nos tornamos. Uma marca mais madura, com novos projetos, novas experiências e a mesma essência que deu origem a tudo.\n\nAlgumas histórias merecem ser contadas novamente. E algumas chamas sempre encontram uma maneira de continuar acesas.","layout":"text","images":[],"links":[]}];
const seedBlocks = (_p: Profile): AboutBlock[] => storyBlocks;
export const Route = createFileRoute("/admin/sobre")({ component: AdminSobre });
function AdminSobre() {
  const [form, setForm] = useState<Profile>(defaults);
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [bannerSettings, setBannerSettings] = useState({ enabled: false, image_url: "", href: "/loja", title: "" });
  const [message, setMessage] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      const [{ data: profileData, error: profileError }, { data: contentData, error: contentError }] = await Promise.all([
        (supabase as any).from("site_profile").select("*").eq("id", true).maybeSingle(),
        (supabase as any).from("site_content").select("value").eq("key", "about_page_blocks").maybeSingle(),
      ]);
      const { data: bannerData } = await (supabase as any).from("site_content").select("value").eq("key", "about_page_settings").maybeSingle();
      const next = profileData ? { ...defaults, ...profileData } : defaults;
      setBannerSettings({ enabled: false, image_url: "", href: "/loja", title: "", ...(bannerData?.value ?? {}) });
      setForm(next);
      const stored = contentData?.value?.blocks;
      if (contentData?.value?.version === 2 && Array.isArray(stored) && stored.length) {
        const merged = [...stored] as AboutBlock[];
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
      } else setBlocks(seedBlocks(next));
      setMessage(profileError || contentError ? "Não foi possível carregar tudo. Confira a conexão com o banco." : "");
      setLoading(false);
    })();
  }, []);
  function updateBlock(index: number, patch: Partial<AboutBlock>) {
    setBlocks(current => current.map((block, i) => i === index ? { ...block, ...patch } : block));
  }
  async function addImages(index: number, files: FileList | null) {
    if (!files?.length) return;
    setMessage("Enviando imagens...");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadSiteImage(file, "about-page"));
      setBlocks(current => current.map((block, i) => i === index ? { ...block, images: [...block.images, ...urls] } : block));
      setMessage("Imagens carregadas. Salve as alterações para publicá-las na página.");
    } catch (err) {
      setMessage("Não foi possível enviar a imagem: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }
  function updateLink(blockIndex: number, linkIndex: number, patch: Partial<AboutLink>) {
    setBlocks(current => current.map((block, i) => i === blockIndex ? { ...block, links: block.links.map((link, j) => j === linkIndex ? { ...link, ...patch } : link) } : block));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const profilePayload = { ...form, id: true, updated_at: new Date().toISOString() };
      const { error: profileError } = await (supabase as any).from("site_profile").upsert(profilePayload, { onConflict: "id" });
      if (profileError) throw profileError;
      const { error: blocksError } = await (supabase as any).from("site_content").upsert({ key: "about_page_blocks", value: { version: 2, blocks }, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (blocksError) throw blocksError;
      const { error: bannerError } = await (supabase as any).from("site_content").upsert({ key: "about_page_settings", value: bannerSettings, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (bannerError) throw bannerError;
      setMessage("Alterações salvas. A página pública Conheça a Hiraeth será atualizada ao recarregar.");
    } catch (err) {
      setMessage("Não foi possível salvar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally { setSaving(false); }
  }
  function field(label: string, key: "instagram_url" | "whatsapp_number" | "whatsapp_url" | "contact_email", placeholder = "") {
    return <label className="grid gap-2 text-sm">{label}<input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="border bg-transparent px-3 py-3" /></label>;
  }
  if (loading) return <p className="text-muted-foreground">Carregando editor...</p>;
  return <div className="space-y-8">
    <div><p className="text-xs uppercase tracking-widest text-primary">Conteúdo do site</p><h1 className="mt-2 text-4xl">Conheça a Hiraeth</h1><p className="mt-2 text-muted-foreground">Monte a página por blocos. Edite textos, adicione fotos e links, escolha o layout e altere a ordem das seções.</p></div>
    {message && <p role="status" className="border border-primary/30 p-3 text-sm">{message}</p>}
    <form onSubmit={save} className="space-y-6">
      {blocks.map((block, index) => <section key={block.id} className="space-y-4 border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl text-foreground">Bloco {index + 1}</h2><div className="flex flex-wrap gap-2">
          <button type="button" disabled={index === 0} onClick={() => setBlocks(current => { const next = [...current]; [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!]; return next; })} className="border px-3 py-2 text-sm disabled:opacity-40">↑ Subir</button>
          <button type="button" disabled={index === blocks.length - 1} onClick={() => setBlocks(current => { const next = [...current]; [next[index + 1]!, next[index]!] = [next[index]!, next[index + 1]!]; return next; })} className="border px-3 py-2 text-sm disabled:opacity-40">↓ Descer</button>
          <button type="button" onClick={() => setBlocks(current => current.filter((_, i) => i !== index))} className="border border-destructive px-3 py-2 text-sm text-destructive">Excluir bloco</button>
        </div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">Título<input value={block.title} onChange={e => updateBlock(index, { title: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="Título desta seção" /></label>
          <label className="grid gap-2 text-sm">Layout<select value={block.layout} onChange={e => updateBlock(index, { layout: e.target.value as AboutBlock["layout"] })} className="border bg-background px-3 py-3"><option value="text">Texto e links</option><option value="image-left">Imagem à esquerda</option><option value="image-right">Imagem à direita</option><option value="gallery">Galeria de fotos</option></select></label>
        </div>
        <label className="grid gap-2 text-sm">Texto<textarea rows={6} value={block.text} onChange={e => updateBlock(index, { text: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="Escreva o conteúdo desta seção..." /></label>
        <div className="space-y-3"><h3 className="text-sm font-medium">Fotos deste bloco</h3><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => { void addImages(index, e.target.files); e.currentTarget.value = ""; }} className="block w-full border px-3 py-3 text-sm" /><p className="text-xs text-muted-foreground">JPG, PNG ou WebP; até 5 MB por imagem.</p>
          {block.images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{block.images.map((url, imageIndex) => <div key={url + imageIndex} className="space-y-2"><img src={url} alt="" className="aspect-[4/5] w-full object-cover" /><button type="button" onClick={() => updateBlock(index, { images: block.images.filter((_, i) => i !== imageIndex) })} className="text-xs text-destructive">Remover foto</button></div>)}</div>}
        </div>
        <div className="space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">Links e botões</h3><button type="button" onClick={() => updateBlock(index, { links: [...block.links, { label: "", url: "" }] })} className="border px-3 py-2 text-sm">+ Adicionar link</button></div>
          {block.links.map((link, linkIndex) => <div key={linkIndex} className="grid gap-3 border p-3 md:grid-cols-[1fr_2fr_auto]"><label className="grid gap-1 text-sm">Texto do botão<input value={link.label} onChange={e => updateLink(index, linkIndex, { label: e.target.value })} className="border bg-transparent px-3 py-2" placeholder="Ex.: Conheça a loja" /></label><label className="grid gap-1 text-sm">Destino / URL<input value={link.url} onChange={e => updateLink(index, linkIndex, { url: e.target.value })} className="border bg-transparent px-3 py-2" placeholder="/loja ou https://..." /></label><button type="button" onClick={() => updateBlock(index, { links: block.links.filter((_, i) => i !== linkIndex) })} className="self-end px-2 py-2 text-sm text-destructive">Remover</button></div>)}
        </div>
      </section>)}
      <button type="button" onClick={() => setBlocks(current => [...current, { id: makeId(), title: "", text: "", layout: "text", images: [], links: [] }])} className="border border-primary px-4 py-3 text-sm text-primary">+ Adicionar seção</button>
      <section className="space-y-4 border bg-card p-5">
        <h2 className="text-xl">Banner opcional da página Sobre</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bannerSettings.enabled} onChange={e => setBannerSettings({ ...bannerSettings, enabled: e.target.checked })} /> Exibir banner na página pública</label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">Título acessível do banner<input value={bannerSettings.title} onChange={e => setBannerSettings({ ...bannerSettings, title: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="Conheça o universo Hiraeth" /></label>
          <label className="grid gap-2 text-sm">Link ao clicar<input value={bannerSettings.href} onChange={e => setBannerSettings({ ...bannerSettings, href: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="/loja ou https://..." /></label>
          <label className="grid gap-2 text-sm md:col-span-2">Enviar imagem do banner<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => { const input = e.currentTarget; const file = input.files?.[0]; if (!file) return; try { setMessage("Enviando banner..."); const url = await uploadSiteImage(file, "about-banner"); setBannerSettings(current => ({ ...current, image_url: url })); setMessage("Banner carregado. Salve as alterações para aplicá-lo."); } catch (err) { setMessage("Não foi possível enviar o banner: " + (err instanceof Error ? err.message : "erro desconhecido")); } finally { input.value = ""; } }} className="border bg-transparent px-3 py-3" /><span className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB.</span><input aria-label="URL pública da imagem do banner" value={bannerSettings.image_url} onChange={e => setBannerSettings({ ...bannerSettings, image_url: e.target.value })} className="border bg-transparent px-3 py-3" placeholder="Ou cole uma URL pública de imagem" /></label>
        </div>
        {bannerSettings.image_url && <img src={bannerSettings.image_url} alt="Prévia do banner" className="max-h-56 w-full object-cover" />}
        <p className="text-xs text-muted-foreground">Desmarque “Exibir banner” para removê-lo sem apagar a imagem. Use uma URL pública de imagem.</p>
      </section>
      <section className="space-y-4 border bg-card p-5"><h2 className="text-xl">Contatos do rodapé</h2><p className="text-xs text-muted-foreground">Esses campos continuam controlando os canais de contato exibidos no rodapé.</p><div className="grid gap-4 md:grid-cols-2">{field("Link do Instagram", "instagram_url", "https://instagram.com/sua_marca")}{field("Número do WhatsApp com código do país", "whatsapp_number", "5547999999999")}{field("Link do WhatsApp (opcional)", "whatsapp_url", "https://wa.me/5547999999999")}{field("E-mail de contato", "contact_email", "contato@hiraeth.com.br")}</div></section>
      <button disabled={saving} className="bg-primary px-6 py-3 text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button>
    </form>
  </div>;
}
