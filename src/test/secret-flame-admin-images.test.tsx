import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), upsert: vi.fn(), success: vi.fn(), error: vi.fn(), welcome: null as unknown }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
vi.mock("@/lib/admin-edit", () => ({
  useSiteContent: (_key: string, defaults: unknown) => [mocks.welcome ?? (mocks.welcome = defaults), async () => {}],
  uploadSiteImage: mocks.upload,
}));
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({ aspect, onApply, onCancel }: {
    aspect: string; onApply: (file: File) => Promise<void>; onCancel: () => void;
  }) => <div aria-label="Editor de recorte da imagem">
    <p>Recorte {aspect} com zoom</p>
    <button type="button" onClick={() => void onApply(new File(["cropped"], "ajustada.webp", { type: "image/webp" }))}>
      Aplicar recorte
    </button>
    <button type="button" onClick={onCancel}>Cancelar recorte</button>
  </div>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        upsert: async (payload: unknown, opts: unknown) => {
          mocks.upsert(payload, opts);
          return { error: null };
        },
        order: () => query,
        eq: () => query,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/admin/promocoes";
const AdminPromotions = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.welcome = null;
  mocks.upload.mockResolvedValue("https://cdn.example.test/secret-flame-cards/carta-ajustada.webp");
});
afterEach(cleanup);

describe("Imagens das quatro cartas na administração", () => {
  it("provides four file selectors without requiring image URLs", () => {
    render(<AdminPromotions />);
    for (let i = 1; i <= 4; i++) {
      expect(screen.getByLabelText("Enviar imagem da carta " + i)).toHaveAttribute("type", "file");
    }
    expect(screen.queryByPlaceholderText(/url.*imagem/i)).not.toBeInTheDocument();
  });

  it("can save only the card images without configuring all four rewards", async () => {
    render(<AdminPromotions />);
    const select = screen.getByLabelText("Enviar imagem da carta 1");
    fireEvent.change(select, { target: { files: [
      new File(["picture"], "carta.png", { type: "image/png" }),
    ] } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await screen.findByRole("img", { name: "Imagem da Carta 1" });
    fireEvent.click(screen.getByRole("button", { name: "Salvar apenas imagens das cartas" }));
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: true,
        candle_images: expect.arrayContaining([
          expect.objectContaining({
            image_url: "https://cdn.example.test/secret-flame-cards/carta-ajustada.webp",
          }),
        ]),
      }),
      { onConflict: "id" },
    ));
    expect(mocks.success).toHaveBeenCalledWith("As imagens das quatro cartas foram salvas.");
  });

  it("saves four rewards even when coupon and discount prizes have no coupon code", async () => {
    render(<AdminPromotions />);
    const types = screen.getAllByLabelText("Tipo de benefício");
    const titles = screen.getAllByLabelText("Nome do benefício");
    const coupons = screen.getAllByLabelText("Código do cupom (opcional, pode ficar vazio)");
    expect(types).toHaveLength(4);
    expect(coupons).toHaveLength(4);

    fireEvent.change(types[0]!, { target: { value: "coupon" } });
    fireEvent.change(types[1]!, { target: { value: "discount" } });
    titles.forEach((input, index) =>
      fireEvent.change(input, { target: { value: "Benefício da carta " + (index + 1) } }));
    expect(coupons[0]).toHaveValue("");
    expect(coupons[1]).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração do Tarô da Fênix" }));
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ candle_index: 0, reward_type: "coupon", coupon_code: null }),
        expect.objectContaining({ candle_index: 1, reward_type: "discount", coupon_code: null }),
      ]),
      { onConflict: "candle_index" },
    ));
    expect(mocks.error).not.toHaveBeenCalledWith(expect.stringContaining("cupom"));
    expect(mocks.success).toHaveBeenCalledWith("O Tarô da Fênix foi salvo.");
  });

  it("opens the portrait crop editor and previews the uploaded photo before saving", async () => {
    render(<AdminPromotions />);
    const picker = screen.getByLabelText("Enviar imagem da carta 1");
    fireEvent.change(picker, { target: { files: [
      new File(["picture"], "minha-carta.png", { type: "image/png" }),
    ] } });
    expect(screen.getByText("Recorte portrait com zoom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("img", { name: "Imagem da Carta 1" }))
      .toHaveAttribute("src", "https://cdn.example.test/secret-flame-cards/carta-ajustada.webp"));
    expect(screen.getByRole("button", { name: "Cortar / dar zoom novamente" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirar foto da carta" }));
    expect(screen.getAllByText("Carta 1").length).toBeGreaterThan(0);
  });
});
