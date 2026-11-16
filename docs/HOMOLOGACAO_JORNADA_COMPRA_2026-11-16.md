# Hiraeth — Liberação segura da jornada de compra (16/11/2026)

> **Situação: checkout implementado e protegido, mas NÃO homologado para cobrar pessoas reais.**
> Este documento não é autorização para mudar secrets, criar pedidos, pagar etiquetas ou emitir NF-e de produção.

## Escopo coberto pelo código
- Produto (tamanho, casa/aleatória, quantidade e estoque), carrinho, cupom, cliente autenticado.
- Endereço próprio, outro endereço, presente, recados, opção de vídeo de embalagem.
- CPF/CNPJ numéricos verificados pelo dígito, telefone nacional com DDD; testes e validação no servidor.
- Cotação Melhor Envio com pesos/dimensões e checagem de estoque/cupom/preço exclusivamente no backend.
- Pix, cartão Mercado Pago Brick; resultados pendente, recusado, aprovado e atenção, sem aprovar pedido via navegador.
- Checkouts recuperados por ID opaco por conta (persistido no navegador), status sempre reconsultado no servidor; nenhum pagamento automático ao recarregar.
- Webhook assinado, idempotência, proteção contra baixa duplicada de estoque e pedidos simulados.
- Administração: pedidos, etapas, NF-e, etiquetas, rastreio e revisão de reembolso com consulta ao provedor.

## Estimativa de peso confirmada pela titular em 16/11/2026

- Vela pequena, rótulo comercial **100 g**: 200 g de vela pronta (pote e tampa), mais aproximadamente 100 g de embalagem/proteção, total previsto **300 g (0,300 kg)** por caixa individual.
- Vela grande, rótulo comercial **250 g**: 400 g de vela pronta, mais aproximadamente 100 g de embalagem/proteção, total previsto **500 g (0,500 kg)** por caixa individual.
- Sem misturar peso do produto com tara da caixa, evitando dupla contagem. No checkout Sandbox, a tara provisória de 100 g é utilizada apenas quando não houver tara de servidor configurada e se tratar de **uma única vela com tamanho conhecido**.
- A titular confirmou o planejamento das caixas, mas estas quantidades continuam **estimativas**, não substituem a pesagem da caixa pronta nem a validação da transportadora. Em produção, é obrigatória tara explícita de valor positivo medido; o sistema conserva as travas de habilitação comercial.
- Caixas de referência: principal 13×13×16 cm; pequena 8×16×11 cm, usada apenas com confirmação específica no servidor (`HIRAETH_SMALL_BOX_FIT_CONFIRMED=true`). O cálculo para pedidos com múltiplas velas não é liberado por esses pesos unitários.

## Bloqueios operacionais atuais
1. **Edge Functions:** verificar logs/deploy efetivo de `commerce-checkout`, `commerce-webhook`, `commerce-fulfillment` e `_shared` na infraestrutura do projeto atual. GitHub e site publicados não provam deploy da função. Não usar referências de projeto Supabase diferente.
2. **Mercado Pago:** conferir no painel do próprio provedor as credenciais de TESTE, chave Pix, webhook e segredo HMAC, sem compartilhar valores. Homologar Pix aprovado/pendente, cartão aprovado/recusado, idempotência, duplicações de webhook e pagamento em revisão.
3. **Frete e caixas:** medir peso de 100 g/250 g com pote/tampa e caixa + palha + proteções + cartões (tara). Validar fisicamente caixa 13×13×16 cm e eventual caixa 8×16×11 cm. Não habilitar mais de uma vela sem teste de empacotamento. `HIRAETH_MAX_ITEMS_PER_PACKAGE` maior que 1 exige também `HIRAETH_MULTI_CANDLE_PACKING_CONFIRMED=true`; neste código, só unidades 100 g podem compartilhar caixa principal após conferência explícita. Tamanhos grandes/mistos permanecem bloqueados. Para múltiplos volumes, implementar/homologar cotações e etiquetas específicas por transportadora.
4. **Expedição e NF-e:** configurar Focus NFe em HOMOLOGAÇÃO, template fiscal e regras por produto aprovadas pela contabilidade, validar emissão/retorno SEFAZ, impressão de DANFE e XML, geração e impressão da etiqueta no Melhor Envio SANDBOX.
5. **Pedido comercial:** um pagamento de teste Mercado Pago `live_mode=false` não gera linhas em `orders`, não reduz estoque e não emite documento comercial. Testar a transação atômica de pedido, cupom e estoque em banco isolado de homologação antes de fazer qualquer venda real.
6. **UX final:** testar compra com conta nova, Pix em Android e desktop, copiar código Pix, refresh no meio do pagamento, troca de endereço, pedido de presente, cupom e status em Minha Conta/Admin. Verificar acessibilidade no celular e conexão lenta.
7. **Pagamento real:** manter `HIRAETH_ALLOW_LIVE_CHARGES=false`, `FOCUSNFE_LIVE_ENABLED=false` e `HIRAETH_ALLOW_LIVE_LABEL_PURCHASES=false` até autorização expressa da titular e aprovação da homologação.

## Teste administrativo seguro (somente leitura)
Em `/admin/expedicao`, usar **Verificar integrações de teste** com conta administrativa. Verificar o retorno de Mercado Pago, Melhor Envio, peso de embalagem medido e presença de configurações fiscais. Esse diagnóstico não substitui pagamento ou nota de teste.

## Publicação
- Validar GitHub Actions `Validate Hiraeth` (testes/build/TypeScript) e `Hiraeth - Verificar Edge Functions` (Deno).
- Integrar a PR somente após ambos passarem.
- Publicar frontend Lovable; **fazer deploy das funções separadamente** e comparar sua versão implantada.
- Acompanhar erros e logs, sem reexecutar pagamento incerto.

**Não alterar logo, conteúdo do catálogo, produtos, pedidos nem informações de clientes para executar esta auditoria.**
