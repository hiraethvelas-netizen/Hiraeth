# Hiraeth — Dados e Clientes (16/11/2026)

## O que aparece na administração
Abra `/admin/dados`, disponível no menu principal e no Dashboard da administração.

**Indicadores 7/30/90 dias**
- Quantidade de entradas/sessões no app e aberturas dos Portais NFC, agregadas por dia;
- Clientes registrados no total e no período;
- Contas identificadas que acessaram app e portais no período (pelo último acesso);
- Integrantes do Círculo do Fogo e aberturas por portal.

**Base de clientes**
- Pesquisa paginada por nome, e-mail, telefone ou usuário da comunidade;
- Filtros: todos os cadastrados, acessaram app, acessaram portal, entraram na comunidade;
- Ficha: contato registrado pelo próprio cliente, endereço da conta, último acesso, participação na comunidade, interesses compartilhados, publicações do feed, pedidos vinculados ao usuário e itens/variações compradas;
- Botões **Abrir e-mail** e **Abrir WhatsApp** encaminham para aplicativos externos. Não enviam mensagens automaticamente nem cadastram disparos de marketing.

## Privacidade e precisão
- Acesso ao app e aos portais: agregado por dia/canal e **deduplicado por aba de navegador/dia/conta**, quando possível, via sessionStorage. Número estimado de sessões, **NÃO visitantes únicos**. Novo dispositivo/aba conta novamente.
- Visitantes anônimos: apenas números agregados. **Sem IP, geolocalização, cookies de publicidade, fingerprint, identificador persistente ou contato associado a quem não se cadastrou**.
- Conta conectada: guarda apenas último acesso ao app, último acesso ao portal e último slug de portal. Não cria histórico de todas as páginas visitadas.
- A política `/privacidade` informa o uso administrativo. Na Minha conta, o checkbox opcional `hiraeth_marketing_opt_in` permite aceitar/revogar comunicações promocionais; começa desmarcado.
- Não confundir autorização de marketing com atendimento a pedidos. **Sem autorização, não fazer campanhas ou mensagens comerciais promocionais.** Dados de pagamento, senhas e mensagens privadas **não fazem parte do painel**.
- Indicadores de acessos **não são retroativos**; só existem a partir do deploy da migração e frontend. Contas, pedidos e posts já existentes são recuperados do banco conforme permissões.
- A busca não inclui a própria conta administrativa no conjunto de clientes; somente contas reais dos consumidores.

## Seguranças
Migration `supabase/migrations/20261116150000_admin_customer_insights.sql`:
- Tabelas `hiraeth_daily_visits` e `hiraeth_customer_activity` com RLS habilitada e acesso de leitura só à função admin;
- Função `hiraeth_record_visit(channel, portal_slug)` exposta a anônimos/autenticados **apenas para incrementar contadores válidos**, sem retornar dados pessoais nem aceitar IP/identificador;
- `hiraeth_admin_insights`, `hiraeth_admin_customers` e `hiraeth_admin_customer_detail`: funções SECURITY DEFINER, `search_path=''`, revogação de EXECUTE para público/anônimo e verificação explícita de `has_role(auth.uid(), 'admin')`. Não conceder SELECT a `auth.users` no frontend.
- Nunca criar políticas `using(true)` para fichas de clientes nem permitir que clientes consultem informações privadas de terceiros.

## Implantação e homologação
1. Verificar que a versão do frontend publicada é a que contém `/admin/dados`.
2. Aplicar a migration no banco PostgreSQL **da Hiraeth Oficial**. Um merge no GitHub **não aplica automaticamente** migration no ambiente Lovable Cloud. Aplicar somente depois da revisão em ambiente compatível e **sem remover ou sobrescrever dados existentes**.
3. Conta admin: `/admin/dados` deve mostrar dados reais das contas já cadastradas; pesquisas por nomes/e-mails/telefones e ficha histórica precisam responder.
4. Conta normal sem admin: não pode acessar `/admin/dados` e chamadas RPC administrativas devem falhar com permissão negada.
5. Visitante não autenticado: entrar no portal e na loja deve incrementar somente os contadores agregados, sem criar perfis; acesso a RPCs administrativos deve falhar.
6. Conta cliente: entrar no app, visitar o portal; verificar timestamps no painel, vínculo apenas ao usuário da sessão.
7. Verificar opt-in/opto-out de marketing em Minha conta; a ficha deve indicar a opção correta. Links de WhatsApp só aparecem quando há telefone válido.
8. Testar sem rede, visitantes que bloqueiam sessionStorage, acesso em outra aba e remoção de conta. Nenhum erro de métrica pode impedir loja ou portal NFC.
9. Revisar política, retenção e base legal com assessoria LGPD antes de campanha e uso comercial intensivo.

**Importante:** dados guardados em mensagens privadas da comunidade, credenciais e segredos financeiros não devem ser expostos no CRM administrativo.
