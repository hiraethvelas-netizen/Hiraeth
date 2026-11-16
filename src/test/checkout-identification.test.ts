import { describe, expect, it } from "vitest";
import { brazilianDigits, isValidBrazilianDocument, isValidBrazilianPhone } from "../../supabase/functions/_shared/commerce-document";
describe("Checkout Hiraeth: identificação antes do pagamento",()=>{
  it("valida CPF e CNPJ inclusive dígitos verificadores",()=>{
    expect(isValidBrazilianDocument("529.982.247-25")).toBe(true);
    expect(isValidBrazilianDocument("11.444.777/0001-61")).toBe(true);
    expect(isValidBrazilianDocument("52998224726")).toBe(false);
    expect(isValidBrazilianDocument("11444777000162")).toBe(false);
    expect(isValidBrazilianDocument("11111111111")).toBe(false);
    expect(isValidBrazilianDocument("00000000000000")).toBe(false);
    expect(brazilianDigits("529.982.247-25")).toBe("52998224725");
  });
  it("verifica telefone brasileiro com DDD",()=>{
    expect(isValidBrazilianPhone("(47) 99999-9999")).toBe(true);
    expect(isValidBrazilianPhone("(47) 3333-2222")).toBe(true);
    expect(isValidBrazilianPhone("00999999999")).toBe(false);
    expect(isValidBrazilianPhone("4799999")).toBe(false);
    expect(isValidBrazilianPhone("4701234567")).toBe(false);
  });
});