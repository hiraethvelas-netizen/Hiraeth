import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";

type AboutContent = { title: string; storyTitle: string; story: string; storyImage: string; ownerTitle: string; ownerText: string; ownerImage: string };
const defaults: AboutContent = {
 title: "Sobre a Hiraeth",
 storyTitle: "A história da Hiraeth",
 story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.",
 storyImage: "", ownerTitle: "Prazer, eu sou a Mari",
 ownerText: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.",
 ownerImage: ""
};
export const Route = createFileRoute("/sobre")({
 head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }] }),
 component: Sobre,
});
function Sobre() {
 const [content, save] = useSiteContent<AboutContent>("about-page", defaults);
 const fields = [
  {name:"title",label:"Título da página",type:"text"},{name:"storyTitle",label:"Título da história",type:"text"},
  {name:"story",label:"Texto sobre a Hiraeth",type:"textarea"},{name:"storyImage",label:"Imagem da história",type:"image"},
  {name:"ownerTitle",label:"Título da apresentação",type:"text"},{name:"ownerText",label:"Texto de apresentação",type:"textarea"},
  {name:"ownerImage",label:"Imagem da Mari",type:"image"}
 ] as const;
 return <PageShell eyebrow="Guardiã da chama" title={content.title}>
  <div className="space-y-8">
   <InlineEditor label="Conheça a Hiraeth" fields={[...fields]} values={content} onSave={async (next) => save({...content,...next} as AboutContent)} />
   {content.storyImage && <img src={content.storyImage} alt="Memórias do início da Hiraeth" className="max-h-[28rem] w-full object-cover" />}
   <section className="space-y-4 whitespace-pre-line"><h2 className="font-display text-3xl text-foreground">{content.storyTitle}</h2><p>{content.story}</p></section>
   <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
    {content.ownerImage && <img src={content.ownerImage} alt="Mari, Guardiã da Chama da Hiraeth" className="w-full object-cover" />}
    <div className="space-y-4 whitespace-pre-line"><p className="eyebrow">Guardiã da chama</p><h2 className="font-display text-3xl text-foreground">{content.ownerTitle}</h2><p>{content.ownerText}</p></div>
   </section>
   <p className="border-t pt-6 italic text-primary">Onde a Chama Acesa te Espera</p>
  </div>
 </PageShell>;
}
