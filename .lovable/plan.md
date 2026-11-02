# Webhook Mercado Pago — HTTP 500 na simulação (05:07 UTC)

## Diagnóstico (somente leitura)

- Registros do commerce-webhook: só um evento de inicialização às 05:06:41 UTC. O erro em si não aparece porque a função não registra o erro antes de responder.
- Segredos: MERCADO_PAGO_ACCESS_TOKEN existe. **MERCADO_PAGO_WEBHOOK_SECRET não existe.**
- Código: a notificação passa no filtro de tipo payment. Em seguida, a validação da assinatura chama `env("MERCADO_PAGO_WEBHOOK_SECRET")`. Sem esse segredo, ela lança "Configuração comercial pendente", que o bloco catch transforma em HTTP 500.

**Causa comprovada (pelo código e pela lista de segredos):** falta o segredo de assinatura do webhook. A função parou antes de qualquer consulta ao Mercado Pago, então nenhuma chamada de pagamento foi feita.

**Hipótese descartada para este envio:** a busca de `/v1/payments/123456` retornar "não encontrado" (o que também daria 500). Ela não chegou a rodar. Vai acontecer depois que o segredo for cadastrado, porque esse pagamento simulado não existe.

## Próximo teste seguro (precisa de autorização)

1. A proprietária copia a "assinatura secreta" de Webhooks no painel do Mercado Pago e cadastra como MERCADO_PAGO_WEBHOOK_SECRET em Configurações do Projeto → Segredos. Não colar no chat.
2. Reenviar a simulação. O esperado agora é um erro na busca do pagamento 123456, que não existe (500 com o código atual). Isso confirma que a assinatura passou, e ele nunca será tratado como aprovado.
3. Opcional, sob autorização: fazer a função responder 200/ignorar quando o pagamento não existir ou vier com live_mode=false, e registrar o motivo do erro sem dados sensíveis.

Nada foi alterado, implantado ou publicado.
