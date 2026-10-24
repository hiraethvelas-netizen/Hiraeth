import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";

export const Route = createFileRoute("/cuidados")({
  head: () => ({
    meta: [
      { title: "Cuidados com as velas — Hiraeth" },
      { name: "description", content: "Primeira queima, pavio, segurança e conservação das velas Hiraeth." },
      { property: "og:title", content: "Cuidados com as velas — Hiraeth" },
      { property: "og:description", content: "Pequenos rituais para sua vela queimar por igual e por mais tempo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cuidados,
});

function H({ children }: { children: string }) {
  return <h2 className="pt-4 text-3xl text-primary">{children}</h2>;
}

function Cuidados() {
  return (
    <PageShell eyebrow="Para a chama durar" title="Cuidados com as velas">
      <H>Primeira queima</H>
      <p>Deixe a vela acesa até que toda a superfície derreta por igual (geralmente 1 cm de cera derretida por cada 2,5 cm de diâmetro). Isso evita o "túnel".</p>
      <H>Pavio</H>
      <p>Apare o pavio para cerca de 5 mm antes de cada uso. Pavios longos geram chama alta e fuligem.</p>
      <H>Tempo de queima</H>
      <p>Não deixe a vela acesa por mais de 4 horas seguidas.</p>
      <H>Segurança</H>
      <ul className="list-disc space-y-2 pl-6 marker:text-primary">
        <li>Nunca deixe uma vela acesa sem supervisão.</li>
        <li>Mantenha longe de crianças, animais, cortinas e objetos inflamáveis.</li>
        <li>Use sobre superfície plana e resistente ao calor.</li>
        <li>Evite correntes de ar.</li>
        <li>Pare de usar quando restar cerca de 1 cm de cera no fundo.</li>
      </ul>
      <H>Para apagar</H>
      <p>Use um abafador ou tampa. Evite soprar, para não espalhar cera e fuligem.</p>
      <H>Conservação</H>
      <p>Guarde tampada, em local fresco, seco e longe da luz solar.</p>
    </PageShell>
  );
}
