import { describe, expect, it } from "vitest";
import { isVerifiedFullRefund } from "../../supabase/functions/_shared/commerce-refund-check";

const checkout={checkoutId:"123e4567-e89b-12d3-a456-426614174000",paymentId:"11223344",total:101.90};
const provider={
  id:11223344,status:"refunded",live_mode:true,external_reference:checkout.checkoutId,
  transaction_amount:101.90,
};

describe("Conciliação financeira: não movimentar dinheiro",()=>{
  it("reconhece somente devolução integral confirmada na conta real",()=>{
    expect(isVerifiedFullRefund(provider,checkout)).toBe(true);
  });
  it("não aceita pagamento pendente, reembolso parcial ou ambiente sandbox",()=>{
    expect(isVerifiedFullRefund({...provider,status:"approved"},checkout)).toBe(false);
    expect(isVerifiedFullRefund({...provider,status:"in_process"},checkout)).toBe(false);
    expect(isVerifiedFullRefund({...provider,transaction_amount:50},checkout)).toBe(false);
    expect(isVerifiedFullRefund({...provider,live_mode:false},checkout)).toBe(false);
  });
  it("rejeita IDs e referência de checkout divergentes",()=>{
    expect(isVerifiedFullRefund({...provider,id:9999},checkout)).toBe(false);
    expect(isVerifiedFullRefund({...provider,external_reference:"outra-compra"},checkout)).toBe(false);
    expect(isVerifiedFullRefund(provider,{...checkout,paymentId:"999"})).toBe(false);
  });
  it("recusa valor inválido ou ausente",()=>{
    expect(isVerifiedFullRefund({...provider,transaction_amount:undefined},checkout)).toBe(false);
    expect(isVerifiedFullRefund(provider,{...checkout,total:0})).toBe(false);
  });
});
