/** Read-only Mercado Pago payment response checks before recording any refund. */
export function isVerifiedFullRefund(
  payment: Record<string,unknown>,
  expected: {checkoutId:string;paymentId:string;total:number},
): boolean {
  const amount=Number(payment['transaction_amount']);
  return payment['live_mode']===true &&
    payment['status']==="refunded" &&
    String(payment['id']??"")===expected.paymentId &&
    payment['external_reference']===expected.checkoutId &&
    Number.isFinite(amount) && Number.isFinite(expected.total) &&
    Math.abs(amount-expected.total)<0.005 &&
    expected.total>0;
}
