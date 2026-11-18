import { describe, expect, it } from "vitest";
import { canUseAutomatedCheckout } from "../../supabase/functions/_shared/commerce-access";

describe("venda assistida: pagamento automático reservado ao admin", () => {
  it("nega quote/init/pay para cliente enquanto a liberação não estiver explícita", () => {
    expect(canUseAutomatedCheckout(false, undefined)).toBe(false);
    expect(canUseAutomatedCheckout(false, "")).toBe(false);
    expect(canUseAutomatedCheckout(false, "false")).toBe(false);
    expect(canUseAutomatedCheckout(false, "TRUE")).toBe(false);
  });
  it("permite homologação administrativa mesmo durante a venda assistida", () => {
    expect(canUseAutomatedCheckout(true, undefined)).toBe(true);
  });
  it("exige liberação literal explícita para retomar checkout de cliente", () => {
    expect(canUseAutomatedCheckout(false, "true")).toBe(true);
  });
});
