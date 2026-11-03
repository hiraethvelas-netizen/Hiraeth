/**
 * Keep the payer's identity separate from the delivery recipient in a gift.
 * Source documents are validated before storage by validateRecipient().
 * This data is used only for payment identification, never for stock changes.
 */
export function payerDocumentForPayment(recipient: {
  document?: unknown; payer_document?: unknown; gift?: unknown;
}): string {
  const digits=(v:unknown)=>typeof v==="string"?v.replace(/\D/g,""):"";
  const document=recipient.gift===true
    ? digits(recipient.payer_document)
    : digits(recipient.document);
  if (![11,14].includes(document.length))
    throw new Error("Informe um CPF ou CNPJ válido para o pagamento.");
  return document;
}
