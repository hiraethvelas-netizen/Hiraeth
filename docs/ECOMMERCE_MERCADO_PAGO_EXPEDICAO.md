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

## Checkout Sandbox restrito à administração (02/11/2026)

- No ambiente `HIRAETH_PAYMENTS_MODE=sandbox`, a resposta pública de `commerce-checkout` (ação `config`) fica `enabled: false` para visitantes e compradores comuns, **mesmo quando** `HIRAETH_COMMERCE_ENABLED=true`; a chave pública de pagamentos também não é devolvida.
- Todas as ações de checkout (`quote`, `init`, `pay`, `status`) são igualmente bloqueadas na API para usuários que não tenham a função `admin` no Supabase. A verificação é feita no servidor, consultando `has_role`, sem confiar no frontend ou no e-mail do usuário.
- Apenas o administrador autenticado poderá ver o formulário completo, cotar o frete e testar transações simuladas quando o comércio for explicitamente habilitado.
- **Ordem de habilitação:** (1) fazer deploy da Edge Function `commerce-checkout` **atualizada**, incluindo os arquivos `_shared`; (2) verificar em execução que os usuários comuns recebem `enabled: false` mesmo com o sistema habilitado; (3) confirmar no painel que ambas as credenciais Mercado Pago são de teste, Melhor Envio é Sandbox e a função `admin` está correta; (4) somente então definir `HIRAETH_COMMERCE_ENABLED=true` para ensaios administrativos. Não antecipar o passo 4.
- O deploy do site/frontend via Lovable **não garante** deploy da Edge Function. Sem acesso para publicar a função, manter `HIRAETH_COMMERCE_ENABLED` ausente ou `false`.
- O limite temporário continua `HIRAETH_MAX_ITEMS_PER_PACKAGE=1`; os testes do carrinho devem usar uma vela por vez. A cotação de frete não é validada ao vivo sem autorização e teste de conectividade do Melhor Envio.
- A volta ao modo de vendas reais requer uma revisão específica de credenciais e controles, não apenas trocar `HIRAETH_PAYMENTS_MODE`. A habilitação de produção precisa de autorização da proprietária e validação independente de todas as integrações.

## Isolamento de pagamentos simulados — atualização de segurança

A aprovação de um pagamento com `live_mode=false` no Mercado Pago **não deve** criar um pedido real, gerar nota fiscal, comprar etiqueta ou baixar o estoque da loja. O checkout grava em `promotion_summary.sandbox` (definido pelo servidor no momento da criação) se a tentativa é de teste; o resultado do provedor precisa trazer um `live_mode` compatível, senão é rejeitado. Este marcador não é confiado ao navegador.

- No modo de testes, somente contas com papel administrativo validado pelo backend podem fazer cotação, criar checkout ou efetuar pagamento simulado.
- O resultado aprovado de teste atualiza apenas o registro `commerce_checkouts` para `paid`, sem chamar `confirm_paid_commerce_checkout` e sem criar linha em `orders`. O valor pago informado pelo provedor é conferido contra o total calculado no servidor; divergências resultam em `paid_attention`.
- O webhook, após validar assinatura criptográfica e consultar o pagamento na API oficial, repete a verificação do ambiente, do valor e do marcador de teste antes de fazer qualquer alteração. Um teste que chegue pelo webhook também não registra pedido real.
- A interface administrativa mostra explicitamente **Pagamento de teste aprovado**, sem apresentar o pedido de teste como uma venda em **Meus pedidos**.
- A homologação fiscal e a compra simulada de etiqueta são fluxos separados; **não podem ser consideradas verificadas** apenas por uma cotação de frete ou por um pagamento de teste.

**ATENÇÃO: somente depois de implantar novamente as Edge Functions `commerce-checkout` e `commerce-webhook` (incluindo os módulos `_shared`) na infraestrutura real da Hiraeth é seguro considerar a ativação do checkout administrativo com `HIRAETH_COMMERCE_ENABLED=true`. GitHub sincronizado e frontend publicado não comprovam atualização das funções. Não ativar o Secret antes dessas verificações.**
