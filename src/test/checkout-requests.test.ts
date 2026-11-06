import { describe, expect, it } from "vitest";
import { normalizeCustomerRequests } from "../../supabase/functions/_shared/checkout-requests";

describe("Recados de clientes no checkout", () => {
  it("aceita um recado para cartinha e solicitação de vídeo", () => {
    expect(normalizeCustomerRequests("  Por favor, incluir uma cartinha.  ", true))
      .toEqual({
        customer_note:"Por favor, incluir uma cartinha.",
        packing_video_requested:true,
      });
  });

  it("mantém texto opcional vazio e vídeo opcional desligado", () => {
    expect(normalizeCustomerRequests(undefined, undefined)).toEqual({
      customer_note:"",packing_video_requested:false,
    });
  });

  it("limita o recado para não armazenar texto arbitrariamente longo", () => {
    expect(normalizeCustomerRequests("X".repeat(1200),false).customer_note).toHaveLength(800);
  });

  it("descarta dados não textuais e não confunde strings com checkbox", () => {
    expect(normalizeCustomerRequests({hidden:"sensitive"},"true")).toEqual({
      customer_note:"",packing_video_requested:false,
    });
  });
});
