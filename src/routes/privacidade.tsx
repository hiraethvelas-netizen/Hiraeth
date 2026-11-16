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
      <div className="space-y-5 text-sm leading-7 text-foreground">
        <p>A Hiraeth trata os dados fornecidos no cadastro e nas compras, como nome, e-mail, telefone opcional, endereço de entrega e histórico de pedidos, para manter sua conta, atender solicitações e entregar encomendas.</p>
        <p><strong>Acessos ao aplicativo e aos Portais NFC:</strong> contamos aberturas/sessões aproximadas por dia e por portal, sem salvar endereço IP, identificação do dispositivo ou perfil de quem visita sem entrar na conta. Se você estiver conectada, podemos registrar a data do último acesso ao app e ao portal, associada à sua conta, para entender o uso dos serviços. Não acompanhamos individualmente cada tela aberta, nem acessamos conversas privadas por meio desse painel.</p>
        <p><strong>Comunidade:</strong> o painel restrito da administração pode consultar a participação no Círculo do Fogo, publicações feitas no feed e interesses compartilhados, para atendimento e gestão da experiência. Informações administrativas de clientes não ficam disponíveis a outros membros.</p>
        <p><strong>Novidades e ofertas:</strong> o recebimento de comunicações promocionais é opcional e exige a autorização marcada em Minha conta. É possível retirar a autorização a qualquer momento nas configurações. Comunicações necessárias sobre pedidos e atendimento são tratadas separadamente.</p>
        <p>Somente contas autorizadas da administração podem consultar as fichas de clientes e as métricas internas. Os acessos agregados não identificam pessoas únicas: uma pessoa pode usar mais de uma aba ou dispositivo.</p>
        <p>Você pode solicitar acesso, correção, revogação de autorização ou exclusão dos seus dados, observadas as obrigações legais de conservação, pela página de <a className="underline text-primary" href="/suporte">suporte</a>. A Hiraeth trata dados conforme a Lei Geral de Proteção de Dados (LGPD).</p>
      </div>
    </PageShell>
  ),
});
