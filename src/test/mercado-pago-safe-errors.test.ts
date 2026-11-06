import { describe, expect, it } from "vitest";
import { safeMercadoPagoError } from "../../supabase/functions/_shared/mercado-pago-safe-errors";

describe("Erros financeiros seguros e interpretáveis",()=>{
  it("distingue recusa de credencial, autorização e validação de dados",()=>{
    expect(safeMercadoPagoError(401)).toMatch(/Access Token/);
    expect(safeMercadoPagoError(403)).toMatch(/permissões/);
    expect(safeMercadoPagoError(400)).toMatch(/dados/);
    expect(safeMercadoPagoError(422)).toMatch(/dados/);
  });
  it("não incentiva nova cobrança em caso de situação desconhecida",()=>{
    expect(safeMercadoPagoError(409)).toMatch(/Não tente pagar novamente/);
    expect(safeMercadoPagoError(429)).toMatch(/Confira o status/);
    expect(safeMercadoPagoError(500)).toMatch(/Confira o status/);
    expect(safeMercadoPagoError(503)).toMatch(/Confira o status/);
  });
  it("não inclui credenciais ou respostas não confiáveis do fornecedor",()=>{
    for(const status of [400,401,403,409,429,500,503]){
      const message=safeMercadoPagoError(status);
      expect(message.length).toBeLessThan(220);
      expect(message).not.toMatch(/Bearer |[a-z0-9]{20,}\.[a-z0-9]{20,}\.[a-z0-9]{20,}/i);
    }
  });
});
