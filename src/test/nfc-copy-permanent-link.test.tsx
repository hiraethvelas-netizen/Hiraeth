import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  writeText: vi.fn(async (_url: string) => {}),
  rpc: vi.fn(async (_name: string) => ({ data: "a".repeat(64), error: null })),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { NfcCodeIssuer } from "@/components/admin/NfcCodeIssuer";

beforeEach(() => {
  mocks.writeText.mockClear();
  mocks.rpc.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mocks.writeText }, configurable: true,
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Painel de gravação NFC", () => {
  it("displays and copies the permanent public URL without generating a token", async () => {
    render(<NfcCodeIssuer portalSlug="o-mundo-de-magia" />);
    const expected = "https://hiraeth-oficial.lovable.app/portal/o-mundo-de-magia";
    expect(screen.getByLabelText("Endereço público — pronto para copiar")).toHaveValue(expected);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link para gravar NFC" }));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith(expected));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps the unique-token workflow separate and optional", async () => {
    render(<NfcCodeIssuer portalSlug="o-mundo-de-magia" />);
    fireEvent.click(screen.getByText(/Avançado: criar link individual/));
    fireEvent.click(screen.getByRole("button", { name: "Gerar código individual (opcional)" }));
    expect(await screen.findByLabelText("Link individual desta vela — não divulgar publicamente"))
      .toHaveValue("https://hiraeth-oficial.lovable.app/portal/o-mundo-de-magia?chave=" + "a".repeat(64));
    expect(screen.getByLabelText("Endereço público — pronto para copiar"))
      .toHaveValue("https://hiraeth-oficial.lovable.app/portal/o-mundo-de-magia");
  });
});
