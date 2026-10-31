import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteLayout";

export const Route = createFileRoute("/termos")({ head: () => ({ meta: [{ title: "Termos e comunidade — Hiraeth" }] }), component: Terms });
function Terms() {
  return <PageShell eyebrow="Nosso espaço compartilhado" title="Termos e comunidade">
    <p>Ao navegar pelo site, criar uma conta ou participar dos espaços da Hiraeth, você concorda em utilizar os serviços de forma responsável, respeitosa e de acordo com a legislação aplicável.</p>
    <h2 className="pt-4 text-2xl text-primary">Compras e informações</h2>
    <p>As informações de produtos, preços, disponibilidade, condições de pagamento e entrega são apresentadas nas respectivas páginas e no fechamento do pedido. Confira os dados antes de concluir uma compra. Em caso de divergência ou dúvida, procure o Suporte.</p>
    <h2 className="pt-4 text-2xl text-primary">Convivência na comunidade</h2>
    <p>Não são permitidos assédio, ameaças, discriminação, spam, golpes, publicação de dados pessoais de terceiros ou conteúdo ilegal. A Hiraeth poderá moderar conteúdos e restringir o acesso a recursos comunitários quando necessário para proteger as pessoas e o ambiente.</p>
    <h2 className="pt-4 text-2xl text-primary">Atualizações</h2>
    <p>Estes termos podem ser atualizados para refletir mudanças no site e nos serviços. A versão vigente ficará disponível nesta página.</p>
    <p>Este texto apresenta orientações gerais de uso e não substitui condições específicas exibidas durante uma compra nem aconselhamento jurídico.</p>
  </PageShell>;
}
