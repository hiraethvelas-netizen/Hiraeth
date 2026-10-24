import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Hiraeth" },
      { name: "description", content: "Como a Hiraeth coleta, usa e protege seus dados." },
      { property: "og:title", content: "Política de privacidade — Hiraeth" },
      { property: "og:description", content: "Como a Hiraeth coleta, usa e protege seus dados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell eyebrow="Legal" title="Política de privacidade">
      <p>Coletamos apenas os dados necessários — nome, e-mail e endereço de entrega — para enviar pedidos e cartas do Círculo. Você pode pedir acesso ou exclusão dos seus dados a qualquer momento, conforme a LGPD.</p>
    </PageShell>
  ),
});
