import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phoenixTarotScope, savePhoenixTarotClaim } from "@/lib/phoenix-tarot";

const mocks = vi.hoisted(() => ({
  error: vi.fn(), success: vi.fn(), copy: vi.fn(), rpc: vi.fn(), navigate: vi.fn(),
  customImage: "https://cdn.example.test/phoenix-tarot/card-one.webp",
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: {component: () => ReactNode}) => ({ options }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteHeader: () => null, SiteFooter: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: { active: true, min_cart_value: 0,
            candle_images: [
              { image_url: mocks.customImage },
              { image_url: "" }, { image_url: "" }, { image_url: "" },
            ] },
          error: null,
        }),
      };
      return query;
    },
    rpc: mocks.rpc,
  },
}));

import { Route as PhoenixTarotRoute } from "@/routes/taro-da-fenix";
import { SecretFlamesPromotion } from "@/components/SecretFlamesPromotion";

const PhoenixTarotReveal = PhoenixTarotRoute.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.navigate.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({
    data: { candle_index: 0, reward: { title: "Um presente da chama", coupon_code: "TESTE" } },
    error: null,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.copy },
  });
});
afterEach(cleanup);

async function renderRevealedCard() {
  savePhoenixTarotClaim(phoenixTarotScope(null), {
    candle_index: 0, reward: { title: "Um presente da chama", coupon_code: "TESTE" },
  });
  render(<PhoenixTarotReveal />);
  fireEvent.click(await screen.findByRole("button", { name: "Revelar minha carta" }));
  return screen.findByRole("button", { name: "Copiar TESTE" });
}

describe("O Tarô da Fênix: escolha e cópia do cupom", () => {
  it("navigates to a separate reveal page after recording the choice, keeping the uploaded image", async () => {
    render(<SecretFlamesPromotion />);
    fireEvent.click(await screen.findByRole("button", { name: "Escolher carta 1" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("claim_secret_flame",
      expect.objectContaining({ p_candle_index: 0 })));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/taro-da-fenix" }));
    expect(localStorage.getItem("hiraeth-phoenix-tarot-choice-v1:" + phoenixTarotScope(null))).toContain("TESTE");
  });

  it("shows the existing uploaded card image unchanged on the separate reveal page", async () => {
    await renderRevealedCard();
    expect(screen.getByRole("img", { name: "Imagem da Carta 1", hidden: true })).toHaveAttribute("src", mocks.customImage);
    expect(screen.getByRole("heading", { name: "O Tarô da Fênix" })).toBeInTheDocument();
    expect(screen.getByTestId("phoenix-tarot-flip")).toHaveAttribute("data-revealed", "true");
    expect(screen.getByText("Um presente da chama")).toBeInTheDocument();
  });

  it("shows success only after the clipboard confirms the copy", async () => {
    let complete!: () => void;
    mocks.copy.mockImplementation(() =>
      new Promise<void>(resolve => { complete = resolve; }),
    );
    fireEvent.click(await renderRevealedCard());
    expect(screen.queryByText("Copiado: TESTE")).not.toBeInTheDocument();
    complete();
    expect(await screen.findByText("Copiado: TESTE")).toBeInTheDocument();
    expect(mocks.copy).toHaveBeenCalledWith("TESTE");
  });

  it("reports a denied clipboard operation and lets the user retry", async () => {
    mocks.copy.mockRejectedValueOnce(new Error("Denied")).mockResolvedValueOnce(undefined);
    fireEvent.click(await renderRevealedCard());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Copiado: TESTE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar TESTE" }));
    expect(await screen.findByText("Copiado: TESTE")).toBeInTheDocument();
  });

  it("handles browsers without the clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    fireEvent.click(await renderRevealedCard());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Copiado: TESTE")).not.toBeInTheDocument();
  });

  it("offers to revisit the same chosen card without claiming another prize", async () => {
    savePhoenixTarotClaim(phoenixTarotScope(null), {
      candle_index: 0,
      reward: { title: "Um presente da chama", coupon_code: "TESTE" },
      already_claimed: true,
    });
    render(<SecretFlamesPromotion />);
    const revisit = await screen.findByRole("button", { name: "Rever minha carta" });
    expect(screen.getByRole("img", { name: "Imagem da Carta 1" })).toHaveAttribute("src", mocks.customImage);
    expect(screen.queryByRole("button", { name: "Escolher carta 2" })).not.toBeInTheDocument();
    fireEvent.click(revisit);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/taro-da-fenix" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not claim a prize by merely opening the result URL without any prior choice", async () => {
    render(<PhoenixTarotReveal />);
    expect(await screen.findByText("Sua carta ainda não foi encontrada")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
