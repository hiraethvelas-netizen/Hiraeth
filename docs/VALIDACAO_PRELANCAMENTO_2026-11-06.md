# Hiraeth — auditoria técnica pré-vendas (06/11/2026)

> **Estado: validação parcial; NÃO liberar cobranças reais.**
> Verificações feitas por GitHub Actions, leitura agregada do banco e requisições públicas sem credenciais.
> Não houve pagamento real, reembolso, NF-e ou compra de etiqueta durante estes testes.

## Testes executados

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes automatizados, build e TypeScript do repositório | APROVADO | GitHub Actions, PRs #48, #49, #50 |
| Página inicial publicada | APROVADO (HTTP 200) | Smoke test #42180729248 |
| Rota `/admin/pedidos` responde | APROVADO (HTTP 200; **não testa login nem componentes internos**) | Smoke test #42180729248 |
| Rota `/admin/expedicao` responde | APROVADO (HTTP 200; **não testa login nem componentes internos**) | Smoke test #42180729248 |
| Checkout não autenticado / ação health | APROVADO (HTTP 401) | Smoke test #42180729248 |
| Expedição não autenticada / leitura | APROVADO (HTTP 401) | Smoke test #42180729248 |
| Tabelas e funções do fluxo financeiro | APROVADO (existência e RLS confirmadas) | Inspeção somente leitura do banco Lovable Cloud |
| Apresentação de tamanho/casa das velas | APROVADO em testes unitários; NÃO HOMOLOGADO visualmente em sessão admin | PR #47 |
| Linha do tempo preparação/envio/entrega | APROVADO em testes unitários e esquema SQL; NÃO TESTADO num pedido real | PR #47 |
| Produto e valores passados para Melhor Envio | APROVADO em testes unitários; função backend da PR #48 AINDA NÃO REIMPLANTADA | PR #48 |
| Verificação de reembolso integral | APROVADO em testes unitários (payload fictício), NÃO TESTADO com pagamento real | PR #47 |
| Classificação de falhas do Mercado Pago | APROVADO em testes unitários; backend da PR #50 AINDA NÃO IMPLANTADO | PR #50 |

## Registro de pagamentos de teste

Em 06/11/2026, uma consulta agregada ao banco encontrou:
- 3 checkouts na situação `awaiting_payment`.
- 0 com identificador de pagamento do Mercado Pago gravado.
- 0 com QR Code Pix gravado.
- 0 pedidos efetivos em `orders`.
- 0 etiquetas, 0 notas fiscais e 0 solicitações financeiras.

**Importante:** não ter ID gravado no banco não demonstra, sozinho, que o provedor jamais recebeu uma solicitação. Consultar o painel do Mercado Pago antes de reenviar pagamentos após um erro.

## Pendências indispensáveis antes da primeira venda real

1. **Deploy da Edge Function.** Lovable retornou bloqueio por falta de créditos ao tentar implantar a correção da PR #48. A PR #50 também alterou um helper compartilhado e precisa de deploy das funções relevantes. Não interpretar código sincronizado no GitHub como função implantada no servidor.
2. **Credenciais Mercado Pago.** Validar com o painel da aplicação o **Access Token privado de Teste** e a **Public Key de Teste** da mesma aplicação, sem enviar chaves por chat. A documentação atual do Mercado Pago indica que o token de teste nas integrações atuais pode usar prefixo `APP_USR-`; prefixo sozinho nunca valida a autenticidade. Verificar também configuração de chave Pix.
3. **Pagamento Pix e cartão.** Em uma sessão autenticada de teste, fazer checkout de sandbox com conta/cartão de teste; validar status API, webhook assinado, QR Code, pagamento aprovado/recusado/pendente, duplicação de webhook e idempotência. Não usar dinheiro de verdade.
4. **Pedido real e estoque.** O sandbox atual não cria pedidos reais; validar em homologação ou em ambiente isolado a criação de `orders`, itens, detalhes da variante, cupons, recados, baixa de estoque e prevenção de duplicidades. Nunca forjar aprovação financeira no navegador.
5. **Embalagens/frete.** Medir peso e dimensões reais de caixas, palha e proteção; testar volumes com 100 g e 250 g, inclusive várias velas e limites das transportadoras.
6. **Fiscal.** Configurar dados do emissor e regras NCM/CFOP/CST com contador, validar Focus NFe em homologação, impressão de DANFE e XML e associação à compra.
7. **Etiqueta.** Depois do deploy da correção #48, criar uma remessa de teste no Melhor Envio Sandbox, conferir destinatário, documento fiscal, nome/variantes e peso, gerar/imprimir a etiqueta **somente no Sandbox**.
8. **Operação administrativa real.** Conferir visualmente a sessão do admin: abrir pedido, e-mail, telefone, endereço, variante/casa, recados, etapa Em preparação, envio, rastreio, entrega, análise financeira, reembolso integral conciliado e cancelamento. Para reembolso, confirmar no provedor antes de declarar conclusão. Não reestocar automaticamente.

## Execução do smoke test público

Arquivo: `scripts/commerce-public-smoke.mjs`. GitHub Actions: `.github/workflows/commerce-public-smoke.yml`.

Resultado confirmado em 06/11/2026: **5 de 5 verificações aprovadas**, execução
https://github.com/hiraethvelas-netizen/Hiraeth/actions/runs/42180729248

O teste apenas acessa URLs públicas e confirma que duas ações sem credenciais são recusadas.
Não utiliza sessão administrativa, dados pessoais ou endpoints que movimentem valores.

## Bloqueios operacionais confirmados

- **Lovable:** workspace sem créditos para executar o agente de deploy de Edge Functions.
- **Supabase direto:** integração adicional identificada, mas ainda não conectada pela titular; conectar permitirá buscar logs e implantar funções sem depender do agente Lovable.
- **Serviços externos:** ausência de credenciais autenticadas disponíveis para validar Pix, NF-e e etiqueta nesta sessão; isso não deve ser contornado copiando tokens para documentação ou chat.

**Critério de conclusão:** testes end-to-end no ambiente correto, documentos de teste verificáveis e liberação explícita, posterior e separada, de pagamentos reais pela titular.
