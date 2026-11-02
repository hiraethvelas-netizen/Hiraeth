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
