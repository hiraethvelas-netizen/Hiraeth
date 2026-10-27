import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";

type CareContent = { title: string; intro: string; firstTitle: string; firstText: string; wickTitle: string; wickText: string; burnTitle: string; burnText: string; safetyTitle: string; safetyText: string; extinguishTitle: string; extinguishText: string; storageTitle: string; storageText: string; mediaImage: string; videoUrl: string };
const defaults: CareContent = {
 title: "Cuidados com as velas", intro: "Pequenos rituais para sua vela queimar por igual, com segurança e por mais tempo.",
 firstTitle: "Primeira queima", firstText: "Deixe a vela acesa até que toda a superfície derreta por igual (geralmente 1 cm de cera derretida por cada 2,5 cm de diâmetro). Isso evita o túnel.",
 wickTitle: "Pavio", wickText: "Apare o pavio para cerca de 5 mm antes de cada uso. Pavios longos geram chama alta e fuligem.",
 burnTitle: "Tempo de queima", burnText: "Não deixe a vela acesa por mais de 4 horas seguidas.",
 safetyTitle: "Segurança", safetyText: "Nunca deixe uma vela acesa sem supervisão.\nMantenha longe de crianças, animais, cortinas e objetos inflamáveis.\nUse sobre superfície plana e resistente ao calor.\nEvite correntes de ar.\nPare de usar quando restar cerca de 1 cm de cera no fundo.",
 extinguishTitle: "Para apagar", extinguishText: "Use um abafador ou tampa. Evite soprar, para não espalhar cera e fuligem.",
 storageTitle: "Conservação", storageText: "Guarde tampada, em local fresco, seco e longe da luz solar.", mediaImage: "", videoUrl: ""
};
export const Route = createFileRoute("/cuidados")({
 head: () => ({ meta: [{ title: "Cuidados com as velas — Hiraeth" }, { name: "description", content: "Primeira queima, pavio, segurança e conservação das velas Hiraeth." }] }),
 component: Cuidados,
});
function H({ children }: { children: string }) { return <h2 className="pt-4 text-3xl text-primary">{children}</h2>; }
function Cuidados() {
 const [content, save] = useSiteContent<CareContent>("care-page", defaults);
 const fields = [
  {name:"title",label:"Título da página",type:"text"},{name:"intro",label:"Introdução",type:"textarea"},
  {name:"firstTitle",label:"Título: primeira queima",type:"text"},{name:"firstText",label:"Texto: primeira queima",type:"textarea"},
  {name:"wickTitle",label:"Título: pavio",type:"text"},{name:"wickText",label:"Texto: pavio",type:"textarea"},
  {name:"burnTitle",label:"Título: tempo de queima",type:"text"},{name:"burnText",label:"Texto: tempo de queima",type:"textarea"},
  {name:"safetyTitle",label:"Título: segurança",type:"text"},{name:"safetyText",label:"Segurança (uma regra por linha)",type:"textarea"},
  {name:"extinguishTitle",label:"Título: para apagar",type:"text"},{name:"extinguishText",label:"Texto: para apagar",type:"textarea"},
  {name:"storageTitle",label:"Título: conservação",type:"text"},{name:"storageText",label:"Texto: conservação",type:"textarea"},
  {name:"mediaImage",label:"Imagem opcional",type:"image",help:"JPG, PNG ou WebP, até 5 MB."},
  {name:"videoUrl",label:"Link de vídeo opcional",type:"text",help:"Cole um link público do YouTube, Vimeo ou vídeo MP4."}
 ] as const;
 return <PageShell eyebrow="Para a chama durar" title={content.title}>
  <div className="space-y-5">
   <InlineEditor label="conteúdo de cuidados" fields={[...fields]} values={content} onSave={async (next) => save({...content,...next} as CareContent)} />
   <p>{content.intro}</p>
   {content.mediaImage && <img src={content.mediaImage} alt="Orientações de cuidado com as velas" className="max-h-[28rem] w-full object-cover" />}
   {content.videoUrl && <p><a href={content.videoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Assistir ao vídeo de cuidados</a></p>}
   {[["firstTitle","firstText"],["wickTitle","wickText"],["burnTitle","burnText"],["safetyTitle","safetyText"],["extinguishTitle","extinguishText"],["storageTitle","storageText"]].map(([titleKey,textKey]) => <section key={titleKey}><H>{content[titleKey as keyof CareContent] as string}</H>{textKey==="safetyText" ? <ul className="list-disc space-y-2 pl-6 marker:text-primary">{(content.safetyText || "").split("\n").filter(Boolean).map((line,i)=><li key={i}>{line}</li>)}</ul> : <p className="whitespace-pre-line">{content[textKey as keyof CareContent] as string}</p>}</section>)}
  </div>
 </PageShell>;
}
