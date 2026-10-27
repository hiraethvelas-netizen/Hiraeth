import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";

type CareContent = { title: string; intro: string; customText?: string; firstTitle: string; firstText: string; wickTitle: string; wickText: string; burnTitle: string; burnText: string; safetyTitle: string; safetyText: string; extinguishTitle: string; extinguishText: string; storageTitle: string; storageText: string; mediaImage: string; videoUrl: string; bannerImage: string; showBanner: boolean; mediaLinkLabel: string; mediaLinkUrl: string; modalTitle: string; modalText: string; modalButton: string };
const defaults: CareContent = {
 title: "Cuidados com o seu portal", intro: "",
 firstTitle: "Primeira queima", firstText: "Deixe a vela acesa até que toda a superfície derreta por igual (geralmente 1 cm de cera derretida por cada 2,5 cm de diâmetro). Isso evita o túnel.",
 wickTitle: "Pavio", wickText: "Apare o pavio para cerca de 5 mm antes de cada uso. Pavios longos geram chama alta e fuligem.",
 burnTitle: "Tempo de queima", burnText: "Não deixe a vela acesa por mais de 4 horas seguidas.",
 safetyTitle: "Segurança", safetyText: "Nunca deixe uma vela acesa sem supervisão.\nMantenha longe de crianças, animais, cortinas e objetos inflamáveis.\nUse sobre superfície plana e resistente ao calor.\nEvite correntes de ar.\nPare de usar quando restar cerca de 1 cm de cera no fundo.",
 extinguishTitle: "Para apagar", extinguishText: "Use um abafador ou tampa. Evite soprar, para não espalhar cera e fuligem.",
 storageTitle: "Conservação", storageText: "Guarde tampada, em local fresco, seco e longe da luz solar.", mediaImage: "", videoUrl: "https://www.youtube.com/shorts/grP7IteI5r4", customText: "",
 bannerImage: "", showBanner: false, mediaLinkLabel: "", mediaLinkUrl: "", modalTitle: "", modalText: "", modalButton: "Saiba mais"
};
export const Route = createFileRoute("/cuidados")({
 head: () => ({ meta: [{ title: "Cuidados com o seu portal — Hiraeth" }, { name: "description", content: "Um ritual de cuidado para o seu portal Hiraeth." }] }),
 component: Cuidados,
});
function H({ children }: { children: string }) { return <h2 className="pt-4 text-3xl text-primary">{children}</h2>; }
function Cuidados() {
 const [content, save] = useSiteContent<CareContent>("care-page", defaults);
 const [modalOpen, setModalOpen] = useState(false);
 const fields = [
  {name:"title",label:"Título da página",type:"text"},{name:"intro",label:"Texto de introdução opcional",type:"textarea"},{name:"customText",label:"Textos adicionais opcionais (pode deixar em branco)",type:"textarea"},
  {name:"bannerImage",label:"Imagem do banner opcional",type:"image",help:"Envie uma imagem para o banner da página."},
  {name:"showBanner",label:"Exibir banner",type:"checkbox"},
  {name:"videoUrl",label:"Link de vídeo opcional",type:"text",help:"Cole um link público do YouTube, Vimeo ou vídeo MP4."},
  {name:"mediaLinkLabel",label:"Texto do link/botão opcional",type:"text"},
  {name:"mediaLinkUrl",label:"URL do link/botão",type:"text"},
  {name:"modalTitle",label:"Título do modal opcional",type:"text"},
  {name:"modalText",label:"Texto do modal",type:"textarea"},
  {name:"modalButton",label:"Texto do botão do modal",type:"text"}
 ] as const;
 return <PageShell eyebrow="Um pequeno ritual" title="Cuidados com o seu portal">
  <div className="space-y-5">
   <InlineEditor label="conteúdo de cuidados" fields={[...fields]} values={content} onSave={async (next) => save({...content,...next} as CareContent)} />
   {content.intro?.trim() && <p className="whitespace-pre-line">{content.intro}</p>}
   {content.customText?.trim() && <div className="whitespace-pre-line leading-7">{content.customText}</div>}
   {content.showBanner && content.bannerImage && <img src={content.bannerImage} alt="Banner de cuidados com as velas" className="max-h-[28rem] w-full object-cover" />}
   {content.videoUrl && <div className="space-y-2"><a href={content.videoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Assistir ao vídeo de cuidados</a>{(content.videoUrl.includes("youtube.com") || content.videoUrl.includes("youtu.be") || content.videoUrl.includes("vimeo.com")) && <div className="mx-auto w-full max-w-md overflow-hidden"><div className="aspect-[9/16]"><iframe title="Cuidados com o seu portal" src={`https://www.youtube.com/embed/${content.videoUrl.match(/(?:shorts\/|youtu\.be\/|v=)([\w-]+)/)?.[1] || "grP7IteI5r4"}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></div>}</div>}
   {content.mediaLinkLabel && content.mediaLinkUrl && <p><a href={content.mediaLinkUrl} target={content.mediaLinkUrl.startsWith("http") ? "_blank" : undefined} rel={content.mediaLinkUrl.startsWith("http") ? "noreferrer" : undefined} className="inline-flex border border-primary px-4 py-2 text-primary">{content.mediaLinkLabel}</a></p>}
   {content.modalTitle && content.modalText && <><button type="button" onClick={() => setModalOpen(true)} className="border border-primary px-4 py-2 text-primary">{content.modalButton || "Saiba mais"}</button>{modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={content.modalTitle} onClick={() => setModalOpen(false)}><div className="w-full max-w-xl border border-primary/30 bg-background p-6 text-foreground shadow-xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><h2 className="text-2xl text-primary">{content.modalTitle}</h2><button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar janela" className="border px-3 py-1">Fechar</button></div><p className="mt-4 whitespace-pre-line leading-7">{content.modalText}</p></div></div>}</>}

  </div>
 </PageShell>;
}
