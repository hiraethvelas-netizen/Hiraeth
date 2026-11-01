import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretFlamesPromotion } from "@/components/SecretFlamesPromotion";

const mocks = vi.hoisted(() => ({ error: vi.fn(), copy: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { active: true } }),
      };
      return query;
    },
    rpc: async () => ({ data: { candle_index: 0, reward: { coupon_code: "TESTE" } }, error: null }),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.copy },
  });
});
afterEach(cleanup);
async function revealCoupon() {
  render(<SecretFlamesPromotion />);
  fireEvent.click((await screen.findAllByRole("button", { name: /Escolher esta vela/ }))[0]!);
  return screen.findByRole("button", { name: "TESTE" });
}
describe("Secret Flames coupon copy", () => {
  it("shows success only after the clipboard confirms the copy", async () => {
    let complete!: () => void;
    mocks.copy.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    fireEvent.click(await revealCoupon());
    expect(screen.queryByText("Cupom copiado")).not.toBeInTheDocument();
    complete();
    expect(await screen.findByText("Cupom copiado")).toBeInTheDocument();
    expect(mocks.copy).toHaveBeenCalledWith("TESTE");
  });
  it("reports a denied clipboard operation and lets the user retry", async () => {
    mocks.copy.mockRejectedValueOnce(new Error("Denied")).mockResolvedValueOnce(undefined);
    fireEvent.click(await revealCoupon());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Cupom copiado")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TESTE" }));
    expect(await screen.findByText("Cupom copiado")).toBeInTheDocument();
  });
  it("handles browsers without the clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    fireEvent.click(await revealCoupon());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Cupom copiado")).not.toBeInTheDocument();
  });
});
