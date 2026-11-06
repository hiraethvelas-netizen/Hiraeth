/**
 * Map HTTP statuses from Mercado Pago to deliberately generic, actionable
 * messages. NEVER include raw response bodies, headers, payment details,
 * account IDs, access tokens or card information in customer-facing errors.
 * All payment retries remain separately protected by checkout idempotency.
 */
export function safeMercadoPagoError(status:number):string {
  if(status===401) return "O Mercado Pago recusou a credencial de acesso. A administração deve conferir o Access Token de teste.";
  if(status===403) return "O Mercado Pago não autorizou esta operação. Confira as permissões da conta de pagamentos.";
  if(status===400 || status===422) return "O Mercado Pago recusou os dados da operação. Confira a conta de teste e as informações do pagador.";
  if(status===409) return "O Mercado Pago identificou um conflito na operação. Não tente pagar novamente antes de conferir o status.";
  if(status===429) return "O Mercado Pago limitou temporariamente as solicitações. Confira o status antes de uma nova tentativa.";
  if(status>=500) return "O Mercado Pago está temporariamente indisponível. Confira o status da tentativa antes de pagar novamente.";
  return "O Mercado Pago não confirmou a operação. Confira o status antes de tentar novamente.";
}
