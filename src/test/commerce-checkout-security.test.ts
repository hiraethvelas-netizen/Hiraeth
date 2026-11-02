import { describe, expect, it } from "vitest";
import {
  calculateCheckoutPrice, snapshotProducts, validateItems, money,
} from "../../supabase/functions/_shared/commerce-pricing";
import { validMercadoPagoSignature } from "../../supabase/functions/_shared/mercado-pago-signature";

const id = "6c3efc18-cdbc-4cc1-918a-1fc53087d522";
const otherId = "e3c182d1-6a9d-45bc-b3e7-89a1180f9772";
const goods = [
  { id, name: "Vela Fênix",status:"published",stock:5,price:80,sale_price:70,
    category_id:"magia",weight_grams:350,variants:[] },
  { id:otherId,name:"Camiseta",status:"published",stock:3,price:100,sale_price:null,
    category_id:"camisetas",weight_grams:180,variants:[] },
];
const promotion = {id:"auto",name:"Desconto",kind:"automatic_discount",
  active:true,visible:true,all_products:true,discount_type:"percent",discount_value:20,
  min_cart_value:0,buy_quantity:null,pay_quantity:null,
  eligible_product_ids:[],eligible_category_ids:[],gift_name:null,
  starts_at:null,ends_at:null,usage_limit:null,usage_count:0,code:null};

describe("Checkout Hiraeth — precificação sempre no servidor", () => {
  it("does not trust prices, descriptions or stock values sent by the buyer", () => {
    const userInput = validateItems([{ productId:id, quantity:2, price:0.01, name:"R$ 0,01",stock:999999 }]);
    const snapshot=snapshotProducts(userInput,goods);
    expect(snapshot[0]).toMatchObject({name:"Vela Fênix",quantity:2,price:70,weightGrams:350});
    expect(money(snapshot[0]!.price*2)).toBe(140);
  });

  it("rejects duplicate lines, negative and excessive quantities", () => {
    expect(()=>validateItems([{productId:id,quantity:1},{productId:id,quantity:1}])).toThrow(/duplicados/);
    expect(()=>validateItems([{productId:id,quantity:0}])).toThrow(/Quantidade/);
    expect(()=>validateItems([{productId:id,quantity:101}])).toThrow(/Quantidade/);
    expect(()=>validateItems([{productId:"test",quantity:1}])).toThrow(/Identificação/);
  });

  it("checks stock before payment without actually changing the inventory", () => {
    expect(()=>snapshotProducts([{productId:id,quantity:6}],goods)).toThrow(/Estoque insuficiente/);
    expect(goods[0]!.stock).toBe(5);
  });

  it("blocks unpublished products and unknown variants", () => {
    expect(()=>snapshotProducts([{productId:id,quantity:1,variantKey:"inventada"}],goods))
      .toThrow(/variação/);
    expect(()=>snapshotProducts([{productId:id,quantity:1}],[{...goods[0],status:"draft"}]))
      .toThrow(/indisponível/);
  });

  it("uses selected combination stock and price, not parent product price", () => {
    const variants=[{type:"combination",key:"combo:tam-g",price:100,sale_price:90,stock:1,
      options:{Tamanho:"G"}}];
    const stock=[{...goods[0],variants,stock:100}];
    expect(snapshotProducts([{productId:id,variantKey:"combo:tam-g",quantity:1}],stock)[0])
      .toMatchObject({price:90,variantKey:"combo:tam-g"});
    expect(()=>snapshotProducts([{productId:id,variantKey:"combo:tam-g",quantity:2}],stock))
      .toThrow(/Estoque insuficiente/);
  });

  it("applies automatic discount and coupon once, then adds calculated shipping", () => {
    const items=snapshotProducts([{productId:id,quantity:2}],goods);
    const coupons=[promotion,{...promotion,id:"coupon",kind:"coupon",code:"CHAMA10",
      discount_value:10}];
    const result=calculateCheckoutPrice(items,coupons,[],"CHAMA10",20);
    expect(result).toMatchObject({subtotal:140,discount:42,shipping:20,total:118,
      coupon_code:"CHAMA10"});
    expect(result.applied).toHaveLength(2);
  });

  it("never accepts an invalid or expired coupon for checkout", () => {
    const items=snapshotProducts([{productId:id,quantity:1}],goods);
    expect(()=>calculateCheckoutPrice(items,[promotion],[],"FAKE",10)).toThrow(/Cupom/);
    const expired={...promotion,id:"expired",kind:"coupon",code:"FAKE",ends_at:"2020-01-01T00:00:00Z"};
    expect(()=>calculateCheckoutPrice(items,[expired],[],"FAKE",10)).toThrow(/Cupom/);
  });

  it("does not charge shipping when a free shipping benefit applies", () => {
    const items=snapshotProducts([{productId:id,quantity:1}],goods);
    const free={...promotion,id:"free",kind:"free_shipping"};
    expect(calculateCheckoutPrice(items,[free],[],"",25)).toMatchObject({shipping:0,total:70});
  });

  it("never creates a zero or negative charge without an explicit zero-value flow", () => {
    const items=snapshotProducts([{productId:id,quantity:1}],goods);
    const full={...promotion,discount_value:100};
    expect(()=>calculateCheckoutPrice(items,[full],[],"",0)).toThrow(/valor zero/);
  });

  it("prevents merchant from quoting freight without real package weights", () => {
    expect(()=>snapshotProducts([{productId:id,quantity:1}],[{...goods[0],weight_grams:0}]))
      .toThrow(/peso/);
  });
});

describe("Mercado Pago HMAC signature", () => {
  async function sign(id:string,requestId:string,ts:string,secret:string) {
    const input=`id:${id};request-id:${requestId};ts:${ts};`;
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
      {name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const hash=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(input)));
    return Array.from(hash,byte=>byte.toString(16).padStart(2,"0")).join("");
  }
  it("accepts the authentic HMAC and rejects mutated ids and secrets", async () => {
    const ts="1793580000",requestId="req-example",secret="testing-webhook-secret";
    const digest=await sign("12345",requestId,ts,secret);
    const signature=`ts=${ts},v1=${digest}`;
    expect(await validMercadoPagoSignature(signature,requestId,"12345",secret)).toBe(true);
    expect(await validMercadoPagoSignature(signature,requestId,"12346",secret)).toBe(false);
    expect(await validMercadoPagoSignature(signature,requestId,"12345","wrong")).toBe(false);
    expect(await validMercadoPagoSignature(signature,"forged-id","12345",secret)).toBe(false);
  });
  it("rejects unsigned callbacks and malformed signatures", async () => {
    expect(await validMercadoPagoSignature("","x","123","secret")).toBe(false);
    expect(await validMercadoPagoSignature("ts=1,v1=abcd","x","123","secret")).toBe(false);
  });
});
