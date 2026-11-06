import { afterEach, describe, expect, it, vi } from "vitest";
import { checkProviderReadOnly, summarizeProviderResponse } from "../../supabase/functions/_shared/commerce-readiness";

afterEach(() => vi.unstubAllGlobals());

describe("Hiraeth: diagnóstico seguro de integrações", () => {
  it("classifica credenciais aceitas e rejeitadas sem expor dados pessoais", () => {
    expect(summarizeProviderResponse(200)).toBe("connected");
    expect(summarizeProviderResponse(204)).toBe("connected");
    expect(summarizeProviderResponse(401)).toBe("rejected");
    expect(summarizeProviderResponse(403)).toBe("rejected");
    expect(summarizeProviderResponse(500)).toBe("unavailable");
    expect(summarizeProviderResponse(null)).toBe("unavailable");
  });

  it("usa somente GET para verificar autorização, sem criar pedidos", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"private":"ignored"}',{status:200}));
    vi.stubGlobal("fetch",fetcher);
    const status = await checkProviderReadOnly("https://api.mercadopago.com/users/me",
      {Authorization:"Bearer SECRET-REDACTED",Accept:"application/json"});
    expect(status).toBe("connected");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({method:"GET"});
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("não consulta o provedor quando falta autorização", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch",fetcher);
    expect(await checkProviderReadOnly("https://api.mercadopago.com/users/me",
      {Authorization:""})).toBe("not_configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("falhas de rede não vazam o token nem detalhes internos", async () => {
    vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("PRIVATE-KEY-SECRET")));
    expect(await checkProviderReadOnly("https://api.mercadopago.com/users/me",
      {Authorization:"Bearer PRIVATE-KEY-SECRET"})).toBe("unavailable");
  });
});
