import { describe, expect, it } from "vitest";
import { shippingProductsFromCheckoutItems } from "../../supabase/functions/_shared/commerce-label-products";

describe("Melhor Envio: itens da etiqueta",()=>{
  it("usa o formato do checkout: name, price, quantity e tamanho/casa",()=>{
    expect(shippingProductsFromCheckoutItems([
      {name:"Chapéu Seletor",price:90,quantity:1,
        variantDetails:{options:{Tamanho:"250g"},house:"Corvinal"}},
      {name:"Casa da Lufa-Lufa",price:50,quantity:2,
        variantDetails:{options:{Tamanho:"100g"}}},
    ])).toEqual([
      {name:"Chapéu Seletor — 250g / Corvinal",quantity:1,unitary_value:90},
      {name:"Casa da Lufa-Lufa — 100g",quantity:2,unitary_value:50},
    ]);
  });
  it("permite pedidos legados com campos do order_items",()=>{
    expect(shippingProductsFromCheckoutItems([
      {product_name:"Vela tradicional",unit_price:50,quantity:1},
    ])).toEqual([{name:"Vela tradicional",unitary_value:50,quantity:1}]);
  });
  it("recusa produtos vazios, preços ausentes e quantidades inválidas",()=>{
    expect(()=>shippingProductsFromCheckoutItems([])).toThrow();
    expect(()=>shippingProductsFromCheckoutItems([{name:"Vela",quantity:1}])).toThrow();
    expect(()=>shippingProductsFromCheckoutItems([{name:"Vela",price:50,quantity:0}])).toThrow();
    expect(()=>shippingProductsFromCheckoutItems([{name:"",price:50,quantity:1}])).toThrow();
  });
});
