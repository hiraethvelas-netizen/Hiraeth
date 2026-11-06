import { describe, expect, it } from "vitest";
import { isCancelledHealthCheck } from "@/lib/integration-health-errors";

describe("Diagnóstico de integrações: cancelamentos de rede", () => {
  it("identifica client cancelled e erros comuns de conexão interrompida", () => {
    expect(isCancelledHealthCheck(new Error("client cancelled"))).toBe(true);
    expect(isCancelledHealthCheck(new Error("The operation was aborted"))).toBe(true);
    expect(isCancelledHealthCheck(new DOMException("The request was aborted","AbortError"))).toBe(true);
    expect(isCancelledHealthCheck(new Error("request timed out"))).toBe(true);
  });

  it("detecta cancelamento escondido no contexto de erro do Supabase", () => {
    const wrapped = {
      message:"Failed to send a request to the Edge Function",
      context:{cause:new Error("Client Cancelled")},
    };
    expect(isCancelledHealthCheck(wrapped)).toBe(true);
  });

  it("não repete requisições por falhas de autenticação ou servidor", () => {
    expect(isCancelledHealthCheck(new Error("Unauthorized"))).toBe(false);
    expect(isCancelledHealthCheck(new Error("Acesso reservado à conta administrativa."))).toBe(false);
    expect(isCancelledHealthCheck(new Error("Internal Server Error"))).toBe(false);
    expect(isCancelledHealthCheck(undefined)).toBe(false);
  });
});
