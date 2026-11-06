/**
 * Melhor Envio label products are derived from the immutable server-created
 * checkout snapshot. The checkout stores "name" and "price", not
 * "product_name"/"unit_price" (those belong to order_items).
 */
export function shippingProductsFromCheckoutItems(input: unknown): Array<{
  name:string;quantity:number;unitary_value:number;
}> {
  if (!Array.isArray(input) || input.length===0 || input.length>30)
    throw new Error("Itens da compra indisponíveis para gerar a etiqueta.");
  return input.map((value:unknown)=>{
    if(!value || typeof value!=="object" || Array.isArray(value))
      throw new Error("Produto da etiqueta inválido.");
    const item=value as Record<string,unknown>;
    const name=typeof item["name"]==="string" ? item["name"].trim()
      : typeof item["product_name"]==="string" ? item["product_name"].trim():"";
    const quantity=Number(item["quantity"]);
    const unitary_value=Number(item["price"]??item["unit_price"]);
    if (!name || name.length>180 ||
      !Number.isSafeInteger(quantity) || quantity<1 || quantity>100 ||
      !Number.isFinite(unitary_value) || unitary_value<=0 || unitary_value>100000)
      throw new Error("Confira a descrição, o valor e a quantidade dos produtos da etiqueta.");

    const details=item["variantDetails"];
    const variant=details && typeof details==="object" && !Array.isArray(details)
      ? details as Record<string,unknown>:{};
    const opts=variant["options"];
    const options=opts && typeof opts==="object" && !Array.isArray(opts)
      ? opts as Record<string,unknown>:{};
    const size=Object.entries(options).find(([key])=>/^(tamanho|peso|size)$/i.test(key));
    const sizeLabel=typeof size?.[1]==="string"?size[1].trim():"";
    const houseLabel=typeof variant["house"]==="string"?variant["house"].trim():"";
    const variantText=[sizeLabel,houseLabel].filter(Boolean).join(" / ");
    const desc=variantText?`${name} — ${variantText}`:name;
    return {name:desc.slice(0,180),quantity,unitary_value};
  });
}
