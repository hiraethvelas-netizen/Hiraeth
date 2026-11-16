import {beforeEach,describe,expect,it} from "vitest";
import {checkoutRecoveryKey,saveCheckoutReference,clearCheckoutReference,readCheckoutReference,restoreCheckout} from "@/lib/checkout-recovery";
const user="e3c182d1-6a9d-45bc-b3e7-89a1180f9772";
const id="6c3efc18-cdbc-4cc1-918a-1fc53087d522";
beforeEach(()=>localStorage.clear());
describe("Recuperação de pagamento sem segunda cobrança",()=>{
  it("salva apenas uma referência de checkout por conta, nunca dados financeiros",()=>{
    saveCheckoutReference(user,id);
    expect(readCheckoutReference(user)).toBe(id);
    expect(localStorage.getItem(checkoutRecoveryKey(user))).not.toContain("cartao");
    expect(readCheckoutReference("conta-invalida")).toBeNull();
    clearCheckoutReference(user);
    expect(readCheckoutReference(user)).toBeNull();
  });
  it("restaura Pix pendente com valores do servidor",()=>{
    expect(restoreCheckout({id,status:"pending",total:95,subtotal:100,shipping:5,discount:10,
      mp_payment_id:"123",pix_qr_code:"PIX-TESTE"})).toMatchObject({
      checkout:{id,total:95,subtotal:100},outcome:{status:"pending",qrCode:"PIX-TESTE"},needsReview:false,
    });
  });
  it("não oferece novo pagamento quando a tentativa anterior está incerta",()=>{
    expect(restoreCheckout({id,status:"awaiting_payment",total:50,discount:0,shipping:0})?.needsReview).toBe(true);
    expect(restoreCheckout({id,status:"processing",total:50,discount:0,shipping:0,mp_payment_id:null})?.needsReview).toBe(true);
    expect(restoreCheckout({id,status:"paid",total:50,discount:0,shipping:0})?.outcome?.status).toBe("paid");
    expect(restoreCheckout({id:"invalid",status:"paid",total:50,discount:0,shipping:0})).toBeNull();
  });
});