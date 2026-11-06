import { describe, expect, it } from "vitest";
import { commerceFailureMessage, isResolvedCheckoutStatus } from "@/lib/commerce-errors";

describe("Hiraeth checkout: failed payment response handling", () => {
  it("shows a safe server validation message from Supabase FunctionsHttpError", async () => {
    const response=new Response(JSON.stringify({
      error:"O Mercado Pago não conseguiu processar a operação. Tente novamente.",
    }),{status:400,headers:{"content-type":"application/json"}});
    const result=await commerceFailureMessage({context:response}, "pay");
    expect(result).toMatch(/Mercado Pago/);
  });

  it("never displays untrusted response payload without the server error field", async () => {
    const response=new Response(JSON.stringify({message:"SECRET-NEVER-SHOW"}),{status:500});
    expect(await commerceFailureMessage({context:response},"pay")).not.toMatch(/SECRET/);
    expect(await commerceFailureMessage({context:response},"pay")).toMatch(/Não tente pagar novamente/);
  });

  it("handles revoked sessions and network failures without pretending payment was refused", async () => {
    const unauthorized=new Response("",{status:401});
    expect(await commerceFailureMessage({context:unauthorized},"pay")).toMatch(/sessão expirou/);
    expect(await commerceFailureMessage(new Error("Network error"),"pay")).toMatch(/confirmar/);
    expect(await commerceFailureMessage(new Error("Network error"),"quote")).toMatch(/conectar/);
  });

  it("recognizes only returned financial states requiring follow-up", () => {
    for (const status of ["paid","paid_attention","pending","processing","rejected"])
      expect(isResolvedCheckoutStatus(status)).toBe(true);
    for (const status of ["awaiting_payment","unknown",null,undefined])
      expect(isResolvedCheckoutStatus(status)).toBe(false);
  });
});
