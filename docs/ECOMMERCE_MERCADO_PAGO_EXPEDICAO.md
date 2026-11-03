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
