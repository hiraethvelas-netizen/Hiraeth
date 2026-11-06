import { describe, expect, it } from "vitest";
import { nextSafeOrderStatus, orderDeliveryInfo, ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL } from "@/lib/order-details";

describe("Hiraeth: dados de entrega e acompanhamento de pedidos", () => {
  it("identifica destinatário de presente e separa o documento da compradora", () => {
    const recipient = orderDeliveryInfo({
      gift:true, name:"Pessoa Presenteada", document:"11111111111",
      payer_document:"22222222222", phone:"47999999999",
      customer_note:"Quero uma cartinha e um laço bonito.", packing_video_requested:true,
      street:"Rua Exemplo", number:"615", complement:"Casa B",
      district:"Centro",city:"Camboriú",state:"SC",postal_code:"88340-000",
    });
    expect(recipient).toMatchObject({
      isGift:true, name:"Pessoa Presenteada",
      document:"11111111111", buyerDocument:"22222222222",
      phone:"47999999999",
      customerNote:"Quero uma cartinha e um laço bonito.",
      packingVideoRequested:true,
    });
    expect(recipient?.addressLines).toContain("Rua Exemplo, 615");
    expect(recipient?.addressLines).toContain("CEP 88340-000");
  });

  it("aceita pedidos legados que não possuem endereço completo", () => {
    expect(orderDeliveryInfo(null)).toBeNull();
    expect(orderDeliveryInfo("texto")).toBeNull();
    expect(orderDeliveryInfo({ name:"Cliente" })).toMatchObject({
      name:"Cliente",isGift:false,addressLines:[],
      customerNote:"",packingVideoRequested:false,
    });
  });

  it("não permite marcar pago, cancelado ou reembolsado pelo seletor de expedição", () => {
    expect(nextSafeOrderStatus("pending","pending","posted")).toBeNull();
    expect(nextSafeOrderStatus("paid",null,"posted")).toBeNull();
    expect(nextSafeOrderStatus("paid","approved","pending")).toBeNull();
    expect(nextSafeOrderStatus("paid","approved","generated")).toBe("shipped");
    expect(nextSafeOrderStatus("paid","approved","posted")).toBe("shipped");
    expect(nextSafeOrderStatus("paid","approved","delivered")).toBeNull();
    expect(nextSafeOrderStatus("shipped","approved","generated")).toBeNull();
    expect(nextSafeOrderStatus("shipped","approved","posted")).toBe("delivered");
    expect(nextSafeOrderStatus("shipped","approved","delivered")).toBeNull();
    expect(nextSafeOrderStatus("delivered","approved","delivered")).toBeNull();
    expect(nextSafeOrderStatus("cancelled","approved","delivered")).toBeNull();
    expect(nextSafeOrderStatus("refunded","approved","delivered")).toBeNull();
  });

  it("mantém as legendas de status utilizadas nos dois painéis", () => {
    expect(ORDER_STATUS_LABEL["paid"]).toBe("Pago");
    expect(SHIPMENT_STATUS_LABEL["posted"]).toBe("Postado");
    expect(SHIPMENT_STATUS_LABEL["failed"]).toBe("Aguardando revisão da entrega");
  });
});
