/** Normalize private, logged-in user_metadata into the existing checkout address shape. */
export type CheckoutRecipientFields = {
  name: string;
  document: string;
  phone: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export const emptyCheckoutRecipient: CheckoutRecipientFields = {
  name: "", document: "", phone: "", postal_code: "", street: "",
  number: "", complement: "", district: "", city: "", state: "",
};

export function checkoutRecipientFromMetadata(metadata: unknown): CheckoutRecipientFields {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return { ...emptyCheckoutRecipient };
  const data = metadata as Record<string, unknown>;
  const field = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const rawAddress = data["address"];
  const address = rawAddress && typeof rawAddress === "object" && !Array.isArray(rawAddress)
    ? rawAddress as Record<string, unknown> : {};
  return {
    name: field(data["display_name"]) || field(data["full_name"]),
    document: (field(data["document"]) || field(data["cpf_cnpj"])).replace(/\D/g,""),
    phone: field(data["phone"]),
    postal_code: field(address["cep"]) || field(address["postal_code"]),
    street: field(address["street"]) || (typeof rawAddress === "string" ? field(rawAddress) : ""),
    number: field(address["number"]),
    complement: field(address["complement"]),
    district: field(address["neighborhood"]) || field(address["district"]),
    city: field(address["city"]),
    state: field(address["state"]).toUpperCase(),
  };
}

export function checkoutMetadataFromRecipient(recipient: CheckoutRecipientFields) {
  return {
    display_name: recipient.name.trim(),
    document: recipient.document.replace(/\D/g,""),
    phone: recipient.phone.trim(),
    address: {
      cep: recipient.postal_code.trim(),
      street: recipient.street.trim(),
      number: recipient.number.trim(),
      complement: recipient.complement.trim(),
      neighborhood: recipient.district.trim(),
      city: recipient.city.trim(),
      state: recipient.state.trim().toUpperCase(),
    },
  };
}
