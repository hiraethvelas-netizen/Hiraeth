import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Hiraeth — Guardiã da chama" },
      { name: "description", content: "Velas literárias e camisetas inspiradas em livros, filmes e séries." },
      { property: "og:title", content: "Sobre a Hiraeth" },
      { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell eyebrow="Guardiã da chama" title="Sobre a Hiraeth">
      <p>Hiraeth é uma marca de velas literárias e camisetas inspiradas em livros, filmes e séries.</p>
      <p>Nossa assinatura — <em className="text-primary">Onde a Chama Acesa te Espera</em> — fala de renascimento, nostalgia e da conexão com os universos que nos formaram.</p>
    </PageShell>
  ),
});
