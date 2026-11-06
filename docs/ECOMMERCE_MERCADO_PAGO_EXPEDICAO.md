# Hiraeth — Implantação segura do e-commerce

## Componentes preparados
- Carrinho: apenas produtos e descontos, sem pedidos fictícios.
- Checkout interno: endereço, cotações de frete, Pix e cartão pelo Mercado Pago.
- Servidor commerce-checkout: valida usuário, estoque, variantes, cupons, preços e frete, criando sessão idempotente.
- Webhook commerce-webhook: exige assinatura HMAC, consulta o pagamento no Mercado Pago e confirma no banco apenas aprovação verificada.
- RPC confirm_paid_commerce_checkout: transação com bloqueio de estoque, pedido e baixa somente após pagamento aprovado.
- Pagamento em revisão: paid_attention, sem baixa de estoque indevida nem cancelamento silencioso.
- Correio da Fênix: NF-e Focus NFe, etiquetas Melhor Envio, compra da etiqueta com confirmação do administrador.

## Habilitação segura
1. Aplicar as migrações em supabase/migrations/20261102000400... e 20261102000500... no Supabase correto.
2. Fazer deploy das três funções da pasta supabase/functions.
3. Configurar secrets no backend: nunca enviar senhas, tokens ou certificados fiscais no chat, nem no GitHub.
4. Testar com credenciais de teste Mercado Pago, Melhor Envio Sandbox e Focus NFe homologação.
5. Conferir pesos e medidas reais, CEP de origem, dados do remetente, limite máximo de itens por pacote.
6. Submeter classificação fiscal e emissão NF-e à aprovação da contabilidade.
7. Habilitar pagamentos reais somente após autorização explícita.

## Secrets de pagamento
SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY: gerenciadas pelo Supabase.
HIRAETH_COMMERCE_ENABLED=false inicialmente.
HIRAETH_PAYMENTS_MODE=sandbox inicialmente.
HIRAETH_TEST_CREDENTIALS_CONFIRMED=false inicialmente; tornar true apenas depois de confirmar as chaves do ambiente Teste no painel Mercado Pago.
HIRAETH_ALLOW_LIVE_CHARGES=false inicialmente.
MERCADO_PAGO_ACCESS_TOKEN=token privado do vendedor.
MERCADO_PAGO_PUBLIC_KEY=chave pública do Brick.
MERCADO_PAGO_WEBHOOK_SECRET=assinatura secreta da aplicação Mercado Pago.
COMMERCE_ALLOWED_ORIGIN=origem permitida, padrão site oficial.

O painel Mercado Pago pode usar o prefixo APP_USR em credenciais de teste e produção. O prefixo, sozinho, não identifica o ambiente. Para testes, confirme explicitamente HIRAETH_TEST_CREDENTIALS_CONFIRMED=true e use exclusivamente as credenciais da aba Teste. Em produção, a liberação exige separadamente HIRAETH_ALLOW_LIVE_CHARGES=true.

## Frete e etiquetas
MELHOR_ENVIO_ENV=sandbox inicialmente.
MELHOR_ENVIO_TOKEN=token privado.
MELHOR_ENVIO_USER_AGENT=nome da aplicação e e-mail de suporte.
MELHOR_ENVIO_ORIGIN_POSTAL_CODE=CEP de origem.
MELHOR_ENVIO_SENDER_JSON=dados reais completos do remetente.
HIRAETH_PACKAGE_WIDTH_CM=largura medida.
HIRAETH_PACKAGE_HEIGHT_CM=altura medida.
HIRAETH_PACKAGE_LENGTH_CM=comprimento medido.
HIRAETH_MAX_ITEMS_PER_PACKAGE=limite físico por pacote.
HIRAETH_DEFAULT_PRODUCT_WEIGHT_GRAMS=peso real de fallback.
HIRAETH_ALLOW_LIVE_LABEL_PURCHASES=false inicialmente.

O fluxo de etiqueta é: cotar, adicionar ao carrinho do Melhor Envio,
comprar com confirmação administrativa, gerar e imprimir.
O sistema nunca compra automaticamente uma etiqueta ao receber pedido.

## Emissão fiscal
FOCUSNFE_TOKEN=token privado.
FOCUSNFE_MODE=homologacao inicialmente.
FOCUSNFE_LIVE_ENABLED=false inicialmente.
FOCUSNFE_TEMPLATE_JSON=emitente e dados fiscais revisados pela contabilidade.
FOCUSNFE_ITEM_RULES_JSON=NCM/CFOP/tributação por produto, validados pelo contador.

A Focus NFe transmite a NF-e para autorização na SEFAZ. Somente o
documento autorizado em produção tem validade fiscal. Homologação não gera
documento real. Para etiqueta de remessa comercial, a chave da NF-e
autorizada precisa existir antes de preparar o envio.

## Webhook
Cadastre na aplicação Mercado Pago o endpoint:
https://<REFERENCIA_DO_SUPABASE>.supabase.co/functions/v1/commerce-webhook

Marque eventos payment. A função não usa JWT de usuário, mas valida a
assinatura criptográfica antes de fazer qualquer alteração. Uma notificação
não é prova suficiente: o backend busca o pagamento direto no Mercado Pago
e confirma a referência e o valor do checkout.

## Testes obrigatórios antes da ativação
- Pix pendente/aprovado, cartão aprovado/recusado, expiração e repetição de pagamento.
- HMAC inválido e webhook adulterado, webhook duplicado e idempotência.
- Último item comprado por dois clientes: sem estoque negativo.
- Produto, variação, preço e cupons alterados: servidor recalcula tudo.
- Frete indisponível, CEP errado, limites de peso e volume.
- Separação dos dados de cada conta.
- Melhor Envio Sandbox: cotação, etiqueta simulada, compra simulada e impressão.
- Focus NFe homologação: enviada, autorizada e rejeitada.
- Revisão manual de payment paid_attention e eventuais estornos.

Nenhum PAN, CVV, validade ou token temporário de cartão é armazenado
na Hiraeth. O Mercado Pago controla o formulário seguro de cartão.

## Documentação oficial
Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick
Melhor Envio: https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio
Focus NFe: https://doc.focusnfe.com.br/reference/introducao

## Peso, embalagem e testes seguros — Hiraeth

- As velas com variação **Tamanho/Peso 100 g** usam provisoriamente **180 g** (pote + tampa + 80 g de cera) para a cotação; as de **250 g**, **616 g** (pote + tampa + 200 g de cera). São estimativas da proprietária, **sem** caixa, palha, plástico-bolha ou cartões. A massa real cadastrada no campo **Peso de envio (g)** da variação sempre prevalece.
- Produtos sem essas variações usam o peso de envio cadastrado no produto `weight_grams`; não aplicar cegamente um peso padrão de vela a camisetas ou outros produtos. Produtos sem peso válido exigem correção antes do checkout.
- `HIRAETH_PACKAGE_WIDTH_CM`, `HIRAETH_PACKAGE_HEIGHT_CM`, `HIRAETH_PACKAGE_LENGTH_CM`: **caixa principal** (atualmente informada como 13 × 13 × 16 cm). A cotação e a criação da etiqueta compartilham o mesmo pacote calculado e armazenado no checkout.
- `HIRAETH_MAX_ITEMS_PER_PACKAGE=1` enquanto não for feito um teste físico com proteção. **Não alterar para 3 só porque três velas pequenas parecem caber**: ainda é preciso verificar medidas internas, fragilidade e massa do pacote.
- `HIRAETH_PACKAGE_TARE_GRAMS`: peso **medido** da caixa principal com palha, plástico-bolha, cartões e demais materiais. Em Sandbox, enquanto não informado, o cálculo demonstra apenas o peso dos produtos e **não representa frete final**. No Melhor Envio de produção, o serviço rejeita a cotação sem tara positiva.
- **Caixa pequena opcional:** configurar `HIRAETH_SMALL_PACKAGE_WIDTH_CM`, `HIRAETH_SMALL_PACKAGE_HEIGHT_CM`, `HIRAETH_SMALL_PACKAGE_LENGTH_CM` e `HIRAETH_SMALL_BOX_FIT_CONFIRMED=true` **somente depois** de comprovar fisicamente que a vela pequena cabe nela protegida; caso contrário, qualquer vela usa a caixa principal. A caixa menor mencionada (8 × 16 × 11 cm) ainda **não está liberada** para envio automático.
- Com o limite de 1 vela por pacote, pedidos com mais de uma vela são bloqueados com mensagem clara, sem cotação subestimada. Uma futura implementação de múltiplos volumes exige rechecagem completa de cotação, checkout e etiquetas.
- **Não ativar cobrança real nem comprar etiquetas reais durante os testes.** Verificar as credenciais de teste na origem, executar testes reais de ponta a ponta e liberar somente após aprovação.

## Checkout completo para clientes, em Sandbox (03/11/2026)

- O fluxo de checkout é público para **clientes autenticados** quando o servidor valida os Secrets e `HIRAETH_COMMERCE_ENABLED=true`. Isso simula a jornada real: endereço, CEP, cotação Melhor Envio, cupons, Pix/cartão de teste e retorno. Login continua obrigatório como na loja real.
- A ação pública `config` só informa o estado de habilitação e a chave *pública* do SDK; não disponibiliza token privado. As ações `quote`, `init`, `pay` e `status` exigem JWT de usuário válido e conferem preço, estoque e titularidade no servidor.
- A verificação de `isCommerceEnabled()` exige modo de pagamentos **sandbox**, credenciais de teste confirmadas e modo Melhor Envio também **sandbox**; ambientes incompatíveis bloqueiam a habilitação. O prefixo APP_USR sozinho não comprova credencial de teste: a proprietária deve validá-la no painel.
- O checkout mostra aviso visível de que está em **ambiente de testes**. Não utilizar cartões reais, nem pagar Pix reais, nem anunciar o site como aberto para vendas reais.
- Com `HIRAETH_MAX_ITEMS_PER_PACKAGE=1`, somente simulações com uma vela por pacote serão aceitas. Pedidos maiores aguardam implementação segura de múltiplas caixas/volumes.
- O código precisa ser integrado, seguido de **deploy efetivo da Edge Function `commerce-checkout`** (incluindo `_shared`), além da publicação da versão de frontend correspondente. O deploy do site não implica deploy das Edge Functions.
- Cobranças reais exigirão homologação à parte e aprovação explícita antes de alterar `HIRAETH_PAYMENTS_MODE`, `MELHOR_ENVIO_ENV` ou `HIRAETH_ALLOW_LIVE_CHARGES`.

## Isolamento de pagamentos simulados — atualização de segurança

A aprovação de um pagamento com `live_mode=false` no Mercado Pago **não deve** criar um pedido real, gerar nota fiscal, comprar etiqueta ou baixar o estoque da loja. O checkout grava em `promotion_summary.sandbox` (definido pelo servidor no momento da criação) se a tentativa é de teste; o resultado do provedor precisa trazer um `live_mode` compatível, senão é rejeitado. Este marcador não é confiado ao navegador.

- No modo de testes, qualquer conta autenticada pode simular cotação e pagamento, respeitando as validações do backend. Isso não cria uma venda real.
- O resultado aprovado de teste atualiza apenas o registro `commerce_checkouts` para `paid`, sem chamar `confirm_paid_commerce_checkout` e sem criar linha em `orders`. O valor pago informado pelo provedor é conferido contra o total calculado no servidor; divergências resultam em `paid_attention`.
- O webhook, após validar assinatura criptográfica e consultar o pagamento na API oficial, repete a verificação do ambiente, do valor e do marcador de teste antes de fazer qualquer alteração. Um teste que chegue pelo webhook também não registra pedido real.
- A interface do checkout mostra explicitamente **Pagamento de teste aprovado**, sem apresentar o pedido de teste como uma venda em **Meus pedidos**.
- A homologação fiscal e a compra simulada de etiqueta são fluxos separados; **não podem ser consideradas verificadas** apenas por uma cotação de frete ou por um pagamento de teste.

**ATENÇÃO: somente depois de implantar novamente as Edge Functions `commerce-checkout` e `commerce-webhook` (incluindo os módulos `_shared`) na infraestrutura real da Hiraeth é seguro considerar a ativação do checkout de testes para clientes autenticados com `HIRAETH_COMMERCE_ENABLED=true`. GitHub sincronizado e frontend publicado não comprovam atualização das funções. Não ativar o Secret antes dessas verificações.**

## Diagnóstico seguro de checkout inativo (03/11/2026)

Se a tela indicar **Pagamento em preparação** mesmo após cadastrar `HIRAETH_COMMERCE_ENABLED`, o endpoint `commerce-checkout` responde `enabled: false` sempre que algum dos critérios do servidor não for atendido. A resposta de `config` pode incluir `setupIssues` com **somente os nomes das configurações que falharam**, mas exclusivamente após confirmar a função `admin` do usuário autenticado por `has_role`. Compradores comuns não recebem esse detalhe. Nunca transmitir valores de Secrets, tokens, assinaturas de webhook ou credenciais para o frontend.

Para conferir, entrar com conta administrativa, abrir o checkout e tocar em **Verificar novamente**. Os nomes mostrados devem ser conferidos no painel de Secrets da Lovable, sem compartilhar valores no chat. Nenhuma verificação ou publicação por si só habilita cobranças reais; a homologação deve permanecer em Sandbox até validação completa.

## Compatibilidade do prefixo Mercado Pago TEST- no Sandbox (03/11/2026)

Alguns tokens de ambiente de testes do Mercado Pago podem começar com `TEST-`, enquanto o formato atual divulgado nas páginas de credenciais das aplicações é `APP_USR-` tanto para teste quanto produção. No checkout da Hiraeth, o verificador de prontidão aceita **`TEST-` ou `APP_USR-` exclusivamente quando `HIRAETH_PAYMENTS_MODE=sandbox` e `HIRAETH_TEST_CREDENTIALS_CONFIRMED=true`**. Em produção, `TEST-` é sempre rejeitado e as demais travas de cobrança real continuam obrigatórias.

**Atenção:** o prefixo, por si só, NÃO comprova que seja um Access Token legítimo ou válido (e não uma Public Key). Conferir no painel do Mercado Pago que o texto foi copiado do campo **Access Token**, seção **Credenciais de teste**, da mesma aplicação cadastrada. A resposta real do provedor deve ser verificada ao testar; não assumir autorização da API por causa do prefixo. Nunca compartilhar o valor de segredo no chat, logs, frontend ou repositório. Sem ativar pagamentos reais ou comprar etiquetas.

## Preenchimento cadastral e entregas para presente (03/11/2026)

- A tela de checkout oferece **Usar meus dados cadastrados**, **Preencher novos dados** e **Enviar de presente para outra pessoa**. Dados existentes (nome, CPF/CNPJ, telefone, CEP, rua, número, complemento, bairro, cidade e UF) são recuperados apenas da sessão autenticada (`auth.user_metadata`); campos ainda não informados ficam editáveis e devem ser preenchidos antes do pagamento.
- O formulário de Minha conta passa a permitir salvar CPF/CNPJ junto do contato e endereço já existentes. Em **Preencher novos dados**, o cliente pode optar por salvar os dados informados em sua própria conta após iniciar o checkout. Nunca salvar automaticamente os dados de terceiros recebendo presentes no cadastro do comprador.
- Para presente, a tela solicita os dados da **pessoa que recebe** e separadamente o CPF/CNPJ de **quem compra**. No registro do checkout, `recipient.document` identifica a entrega e `recipient.payer_document` identifica o pagador; o backend escolhe o pagador verdadeiro para a identificação do Mercado Pago, sem usar o CPF de terceiros indevidamente no pagamento.
- A cotação de frete é invalidada sempre que endereço ou modo de destinatário muda. O carrinho, os preços e a lógica de estoque não sofrem alteração.
- **Ponto de homologação fiscal antes de vendas reais:** quando o comprador e o destinatário forem pessoas diferentes, validar com o contador o preenchimento de destinatário fiscal e local de entrega na NF-e. O checkout de testes não emite notas fiscais ou etiquetas reais. A habilitação para vendas reais continua sujeita a testes separados.

## Visualização e acompanhamento de pedidos (04/11/2026)

- **Administração → Pedidos**: mostra destinatário, telefone, documento, endereço completo e distinção de presente (documento da pessoa que compra separado do recebedor); reúne transportadora, serviço, rastreio e status da expedição quando disponíveis. Estes dados privados são mostrados somente na área administrativa.
- Os botões de status aparecem somente se o pagamento estiver aprovado e houver etiqueta **gerada**. A administração confirma manualmente que o pacote foi postado (`paid → shipped`) e, depois, que houve entrega (`shipped → delivered`). A migração cria `public.advance_order_delivery_status(uuid,text)` para atualizar pedido e expedição juntos com verificações de autorização, aprovação e etiqueta; não modifica pagamentos ou estoque. A alteração de status depende de confirmação explícita e não substitui a comprovação da transportadora.
- **Minha conta → Meus pedidos**: lista apenas os pedidos da pessoa autenticada, com dados de entrega (sem expor CPF/CNPJ), transportadora, estado de envio e código de rastreio quando disponibilizado.
- Os dados de rastreio são buscados pela função SQL `public.get_my_order_tracking(uuid[])`, que devolve apenas campos necessários, filtrados pelo `auth.uid()` proprietário do pedido; não concede acesso direto a `commerce_shipments`, não expõe erros internos, etiquetas ou dados fiscais. A migração `supabase/migrations/20261104010000_customer_order_tracking.sql` deve ser aplicada em Supabase/Lovable Cloud para habilitar o rastreio e as transições administrativas seguras. Enquanto não aplicada, a tela mantém a lista de pedidos e informa que o acompanhamento está indisponível.
- **Sandbox continua separado**: pagamento fictício não cria linha em `orders`; por isso não aparece como venda em Meus pedidos/Administrativo. A confirmação de pedidos reais, baixa de estoque e geração de documentos continuam exigindo validação ponta a ponta antes da ativação em produção.

## Conferência final no painel de expedição (05/11/2026)

A página **Administração → Correio da Fênix** dispõe do botão **Verificar integrações de teste**, que executa uma consulta SOMENTE de leitura, limitada à conta administrativa, em ambiente Mercado Pago Sandbox e Melhor Envio Sandbox. Verifica se o Mercado Pago aceita a credencial através de `GET https://api.mercadopago.com/users/me` e se o Melhor Envio aceita o token para consulta de etiquetas através de `GET /api/v2/me/orders?status=pending`. Só informa o resultado da autorização: não expõe tokens, dados de contas, pedidos ou respostas dos provedores. Credencial aceita **não comprova** sandbox nem realiza testes de pagamento ou emissão fiscal.

A administração também mostra **Histórico de pagamentos simulados**, separado de **Pedidos reais** e de **Pagamentos que exigem revisão**. Os registros de teste são filtrados pelo marcador `promotion_summary.sandbox === true`, criado pelo próprio backend. Eles não são vendas, não produzem expedição e nunca justificam envio ou baixa de estoque.

### Bloqueios que não podem ser concluídos apenas com código

- **Credenciais de pagamento:** confirmar no painel Mercado Pago a credencial privada `Access Token` (documentação atual da integração: prefixo `APP_USR-` também em Teste). Prefixo `TEST-` pode representar outro tipo de credencial. Não compartilhar a chave. Confirmar que a **Public Key** pertence à mesma aplicação no ambiente Teste.
- **Pacote físico:** pesar a caixa, palha, proteção e cartões e validar dimensões internas, especialmente para três velas pequenas; preencher `HIRAETH_PACKAGE_TARE_GRAMS`. Não assumir tara zero na venda real.
- **Várias velas por pedido:** exige modelo homologado de pacotes e compatibilidade de transportadora. O Melhor Envio permite múltiplos volumes em alguns serviços, mas Correios, J&T e Loggi exigem etiquetas separadas (ver documentação oficial); não aumentar o limite de itens por pacote sem essa implementação e teste.
- **Pagamento e webhook:** concluir simulações com Pix e cartão de teste, retorno do pagamento, duplicação de webhook, status pendente/recusado, cupons e última unidade em estoque; a aprovação real do provedor não pode ser presumida por CI.
- **Fisco/expedição:** cadastro completo do remetente, classificação fiscal, NCM/CFOP/tributação, documento fiscal e homologação da NF-e com contador/Focus NFe; depois, etiqueta e rastreio em Melhor Envio Sandbox.
- **Produção:** somente com autorização da proprietária, testes aprovados, credenciais comerciais reais verificadas, estoque físico conferido e contabilidade regularizada. Não habilitar `HIRAETH_ALLOW_LIVE_CHARGES`, `HIRAETH_ALLOW_LIVE_LABEL_PURCHASES` ou modo de produção durante esta revisão.

## Entrega simplificada e recados da cliente (06/11/2026)

No checkout, o cliente escolhe entre **Usar meus dados cadastrais** ou **Usar outros dados**. A segunda opção permite informar um endereço ou destinatário diferente e apresenta, separadamente, o checkbox **Este pedido é um presente**. Para presentes, o CPF/CNPJ da compradora é informado em um campo próprio e nunca é substituído pelo documento da destinatária no Mercado Pago.

Alterações informadas nos próprios dados cadastrais são salvas na conta após preparar a compra. Na opção de outros dados sem marcar presente, a cliente pode escolher salvar as informações. Dados de pessoas presenteadas **não** sobrescrevem o perfil da compradora.

O checkout inclui **Recados para a Hiraeth**: campo de texto opcional (máximo 800 caracteres) para uma carta, instrução de embalagem ou pedido especial, mais checkbox específico de solicitação de vídeo embalando o pedido. Vídeos estão sujeitos à disponibilidade e **não são prometidos automaticamente**. O backend normaliza e limita esses campos e os guarda apenas no objeto privado `recipient` do checkout, que é transferido para `orders.shipping_address` exclusivamente quando um pedido real tiver o pagamento confirmado. Não altera dados fiscais, cupons ou cálculo do frete; os recados não são enviados para APIs de transportadora nem de nota fiscal.

Os recados aparecem em **Administração → Pedidos**, na tela de **Correio da Fênix → Expedição**, e, durante homologação, no **Histórico de pagamentos simulados** (sem criar venda real). A área pública de perfil e a comunidade não expõem essas informações. O botão do Pix exibe somente **Pagamento Pix**. As cores verde-sálvia reforçadas afetam somente o checkout em modo claro.
