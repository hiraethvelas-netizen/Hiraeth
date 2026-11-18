import { describe, expect, it } from "vitest";
import { summarizeCarrierTracking } from "../../supabase/functions/_shared/commerce-tracking";

const label = "5cc1ce3f-aaab-4f12-b113-000000000001";

describe("read-only Melhor Envio tracking", () => {
  it("parses provider responses keyed by label ID", () => {
    expect(summarizeCarrierTracking({ [label]: { status: "posted", tracking: "AB12345BR", recipient: { document: "PRIVATE" } } }, label))
      .toEqual({ found: true, status: "posted", trackingCode: "AB12345BR" });
  });
  it("accepts explicitly matched records nested in orders", () => {
    expect(summarizeCarrierTracking({ orders: [{ id: label, status: "delivered", tracking: null }] }, label))
      .toEqual({ found: true, status: "delivered", trackingCode: null });
  });
  it("never attributes a different label's data to this order", () => {
    expect(summarizeCarrierTracking({ orders: [{ id: "other", status: "delivered" }] }, label))
      .toEqual({ found: false, status: null, trackingCode: null });
  });
  it("does not trust unknown or unsafe provider fields", () => {
    expect(summarizeCarrierTracking({ [label]: { status: "<script>alert(1)</script>", tracking: " bad code " } }, label))
      .toEqual({ found: true, status: null, trackingCode: null });
  });
  it("does not infer status or code from unlabelled provider records", () => {
    expect(summarizeCarrierTracking({ data: { status: "delivered", tracking: "AB12345BR" } }, label))
      .toEqual({ found: false, status: null, trackingCode: null });
  });
});
