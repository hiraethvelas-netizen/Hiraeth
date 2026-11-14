import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ error: null as Error | null })),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.example/recorte-publicado.webp" } })),
  fragments: [
    {
      id: "natal-8", portal_id: "portal-1", position: 8,
      title: "Entre Fios e Magia", body: "Vela natalina.",
      reference: "", context: "", caption: "Entre Fios e Magia",
      image_url: "https://cdn.example/vela-original.png",
    },
    {
      id: "casa-3", portal_id: "portal-1", position: 3,
      title: "Casa do Leão", body: "História da casa.",
      reference: "", context: "", caption: "Casa do Leão",
      image_url: "https://cdn.example/polaroid-original.jpg",
    },
  ],
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({ source, aspect, onApply, onCancel }: {
    source: File | string; aspect: string; onApply: (file: File) => Promise<void>; onCancel: () => void;
  }) => (
    <div aria-label="Editor de recorte da imagem">
      <p>Zoom e recorte: {aspect}</p>
      <p>{typeof source === "string" ? source : source.name}</p>
      <button type="button" onClick={() => void onApply(new File(["recorte"], "hiraeth-recorte.webp", { type: "image/webp" }))}>Aplicar recorte</button>
      <button type="button" onClick={onCancel}>Voltar sem alterar</button>
    </div>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: table === "portals" ? { id: "portal-1", slug: "o-mundo-de-magia" } : null, error: null }),
        order: async () => ({ data: mocks.fragments, error: null }),
        update: (payload: unknown) => {
          mocks.update(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
      return query;
    },
    storage: { from: () => ({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl }) },
  },
}));

import { PortalInspiracoesAdmin } from "@/routes/admin/portal-inspiracoes";

beforeEach(() => {
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockClear();
  mocks.success.mockClear();
  mocks.error.mockClear();
});
afterEach(() => cleanup());

describe("Fotos do Portal NFC: recorte e zoom", () => {
  it("abre a foto natalina já cadastrada para recortar, sem trocar ou enviar antes de aplicar", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar foto da vela Entre Fios e Magia" }));
    const dialog = screen.getByRole("dialog", { name: "Editar e recortar foto da vela" });
    expect(within(dialog).getByText("Zoom e recorte: portrait")).toBeInTheDocument();
    expect(within(dialog).getByText("https://cdn.example/vela-original.png")).toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => {
      expect(mocks.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^inspiracoes\/portal-1\/.+hiraeth-recorte.webp$/),
        expect.objectContaining({ name: "hiraeth-recorte.webp", type: "image/webp" }),
        { upsert: false },
      );
      expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
        image_url: "https://cdn.example/recorte-publicado.webp",
        caption: "Entre Fios e Magia",
      }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("permite escolher outra foto, ajustar polaroid em formato quadrado e cancelar sem salvar", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar foto da polaroid Casa do Leão" }));
    const dialog = screen.getByRole("dialog", { name: "Editar e recortar foto da polaroid" });
    expect(within(dialog).getByText("Zoom e recorte: square")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Escolher foto para recortar"), {
      target: { files: [new File(["outra"], "nova-foto.png", { type: "image/png" })] },
    });
    expect(within(dialog).getByText("nova-foto.png")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar sem alterar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("mantém o recorte aberto se o upload falhar, sem atualizar o fragmento", async () => {
    mocks.upload.mockResolvedValueOnce({ error: new Error("Falha no upload de teste") });
    render(<PortalInspiracoesAdmin portalId="portal-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar foto da vela Entre Fios e Magia" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Falha no upload de teste"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
