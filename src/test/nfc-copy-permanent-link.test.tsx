import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  writeText: vi.fn(async (_url: string) => {}),
  success: vi.fn(), error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { CollectionNfcLink } from "@/components/admin/CollectionNfcLink";
beforeEach(() => {
  mocks.writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Painel NFC: um endereço por coleção", () => {
  it("exibe e copia somente a URL pública da coleção, sem códigos individuais", async () => {
    render(<CollectionNfcLink portalSlug="o-mundo-de-magia" />);
    const expected = "https://hiraeth-oficial.lovable.app/portal/o-mundo-de-magia";
    expect(screen.getByLabelText("Endereço público — pronto para copiar")).toHaveValue(expected);
    expect(screen.queryByRole("button", { name: /gerar código/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/link individual/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar link para gravar NFC" }));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith(expected));
  });
  it("usa um destino por coleção, sem chave na URL", async () => {
    const { rerender } = render(<CollectionNfcLink portalSlug="o-mundo-de-magia" />);
    rerender(<CollectionNfcLink portalSlug="gilmore-girls" />);
    const expected = "https://hiraeth-oficial.lovable.app/portal/gilmore-girls";
    expect(screen.getByLabelText("Endereço público — pronto para copiar")).toHaveValue(expected);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link para gravar NFC" }));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith(expected));
    expect(mocks.writeText.mock.calls.every(([url]) => !String(url).includes("?chave="))).toBe(true);
  });
});
