import { AuthSessionMissingError } from "@supabase/supabase-js";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HouseCup } from "@/components/HouseCup";
import { HOUSE_CHANGED_EVENT } from "@/lib/house-cup";

type AuthResult = { data: { user: { id: string } | null }; error: unknown };
type RpcResult = { data: unknown; error: unknown };

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<AuthResult>>(),
  rpc: vi.fn<(name: string, args?: Record<string, unknown>) => Promise<RpcResult>>(),
  upsert: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: vi.fn(() => ({ upsert: mocks.upsert })),
  },
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

const USER = { id: "fictitious-member" };
const TOKEN_KEY = "hiraeth:nfc:pending-token";
const TOKEN = "a".repeat(64);
const LOOKUP_ERROR = "Não foi possível verificar seu acesso agora. Tente novamente.";
const ACCESS_LOOKUP_ERROR =
  "Não foi possível verificar seu acesso NFC agora. Tente novamente em instantes.";
const CLAIM_ERROR = "Não foi possível validar seu NFC agora. Tente novamente.";

function rpcResults(
  eligible: RpcResult = { data: false, error: null },
  claimed: RpcResult = { data: false, error: null },
) {
  mocks.rpc.mockImplementation(async (name) => {
    if (name === "house_totals") return { data: [], error: null };
    if (name === "has_verified_house_nfc_access") return eligible;
    if (name === "claim_house_nfc_access_code") return claimed;
    throw new Error("Unexpected RPC in fixture");
  });
}

function discover() {
  const button = screen.getByRole("button", { name: "Descubra a sua casa" });
  fireEvent.click(button);
  return button;
}

function expectNoClaimOrHouseSave() {
  expect(mocks.rpc).not.toHaveBeenCalledWith("claim_house_nfc_access_code", expect.anything());
  expect(mocks.upsert).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Escolha sua casa" })).not.toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.getUser.mockReset();
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  rpcResults();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("NFC access feedback in the house cup", () => {
  it("keeps the public-link restriction for an anonymous visitor with no session", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    render(<HouseCup variant="portal" />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Para desbloquear o selinho, acesse o portal pelo NFC individual de uma vela Hiraeth.",
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith("has_verified_house_nfc_access", expect.anything());
    expectNoClaimOrHouseSave();
  });

  it("keeps the NFC restriction when the signed-in member is explicitly ineligible", async () => {
    render(<HouseCup />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O selinho é exclusivo de quem ativa um código NFC individual de uma vela Hiraeth.",
    );
    expectNoClaimOrHouseSave();
  });

  it("reports session failures, catches a rejected request and lets a later retry succeed", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", message: "Fictional unavailable service" },
    });
    render(<HouseCup variant="portal" />);
    const button = discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(LOOKUP_ERROR);
    expectNoClaimOrHouseSave();
    await waitFor(() => expect(button).not.toBeDisabled());
    mocks.getUser.mockRejectedValueOnce(new Error("Fictional network rejection"));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(screen.getByRole("alert")).toHaveTextContent(LOOKUP_ERROR);
    expectNoClaimOrHouseSave();
    rpcResults({ data: true, error: null });
    fireEvent.click(button);
    expect(await screen.findByRole("heading", { name: "Escolha sua casa" })).toBeInTheDocument();
  });

  it("does not call a failed eligibility lookup an NFC rejection or consume the pending token", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, TOKEN);
    rpcResults({ data: null, error: { message: "Fictional missing routine" } });
    render(<HouseCup variant="portal" />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(ACCESS_LOOKUP_ERROR);
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
    expectNoClaimOrHouseSave();
  });

  it("does not grant access for an invalid eligibility response", async () => {
    rpcResults({ data: null, error: null });
    render(<HouseCup />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(ACCESS_LOOKUP_ERROR);
    expectNoClaimOrHouseSave();
  });

  it("opens the choice for a verified member and preserves the selected-house save payload", async () => {
    rpcResults({ data: true, error: null });
    render(<HouseCup variant="portal" />);
    discover();
    expect(await screen.findByRole("heading", { name: "Escolha sua casa" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalledWith("claim_house_nfc_access_code", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /Casa do Leão/ }));
    await waitFor(() =>
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER.id,
          house: "leao",
          updated_at: expect.any(String),
        }),
        { onConflict: "user_id" },
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Escolha sua casa" })).not.toBeInTheDocument(),
    );
  });

  it("removes a pending token only after a successful claim", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, TOKEN);
    rpcResults({ data: false, error: null }, { data: true, error: null });
    render(<HouseCup variant="portal" />);
    discover();
    expect(await screen.findByRole("heading", { name: "Escolha sua casa" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("claim_house_nfc_access_code", { p_token: TOKEN });
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mocks.success).toHaveBeenCalledWith("Portal NFC vinculado à sua conta!");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("keeps the choice and does not write when the session fails while choosing a house", async () => {
    rpcResults({ data: true, error: null });
    render(<HouseCup variant="portal" />);
    discover();
    await screen.findByRole("heading", { name: "Escolha sua casa" });
    mocks.getUser.mockRejectedValueOnce(new Error("Fictional session interruption"));
    fireEvent.click(screen.getByRole("button", { name: /Casa do Leão/ }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "Não foi possível salvar sua casa. Tente novamente.",
      ),
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Escolha sua casa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Casa do Leão/ })).not.toBeDisabled();
  });

  it("keeps the pending token and the restriction when claim returns false", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, TOKEN);
    render(<HouseCup variant="portal" />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este NFC não pôde ser ativado. Confira se o código pertence a uma vela sua e se já foi vinculado.",
    );
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Escolha sua casa" })).not.toBeInTheDocument();
  });

  it("reports claim service failure without discarding the token or granting a choice", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, TOKEN);
    rpcResults(
      { data: false, error: null },
      { data: null, error: { message: "Fictional unavailable claim" } },
    );
    render(<HouseCup />);
    discover();
    expect(await screen.findByRole("alert")).toHaveTextContent(CLAIM_ERROR);
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Escolha sua casa" })).not.toBeInTheDocument();
  });

  it("blocks duplicate discovery requests while the first session lookup is pending", async () => {
    let finishLookup!: (value: AuthResult) => void;
    const pending = new Promise<AuthResult>((resolve) => {
      finishLookup = resolve;
    });
    mocks.getUser.mockReturnValueOnce(pending);
    render(<HouseCup />);
    const button = discover();
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishLookup({ data: { user: USER }, error: null });
    });
    await screen.findByRole("alert");
    expect(button).not.toBeDisabled();
    expectNoClaimOrHouseSave();
  });

  it("keeps the last score after a refresh failure and recovers through retry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let scoreState: "initial" | "failed" | "recovered" = "initial";
    mocks.rpc.mockImplementation(async (name) => {
      if (name !== "house_totals") throw new Error("Unexpected score fixture RPC");
      if (scoreState === "failed") {
        return { data: null, error: { code: "PGRST202", message: "Fictional unavailable count" } };
      }
      return {
        data: [
          { house: "leao", participant_count: scoreState === "initial" ? 3 : 1 },
          { house: "texugo", participant_count: 1 },
        ],
        error: null,
      };
    });
    render(<HouseCup variant="portal" />);
    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();

    scoreState = "failed";
    act(() => {
      window.dispatchEvent(new Event(HOUSE_CHANGED_EVENT));
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Exibindo a última contagem disponível.",
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();

    scoreState = "recovered";
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
