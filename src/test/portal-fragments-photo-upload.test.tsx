import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ error: null })),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.example/hiraeth-foto.webp" } })),
  update: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => {
  const exampleFragment = {
    id: "fragment-1",
    portal_id: "portal-1",
    title: "Casa do Leão",
    body: "A história da vela.",
    reference: "A sala comunal",
    context: "Aroma: Trussardi",
    image_url: null,
    caption: null,
    visible: true,
    position: 3,
  };
  return {
    supabase: {
      storage: {
        from: () => ({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ order: async () => ({ data: [exampleFragment], error: null }) }),
        }),
        update: (payload: unknown) => {
          mocks.update(payload);
          return { eq: async () => ({ data: null, error: null }) };
        },
      }),
    },
  };
});

import { PortalFragmentsEditor } from "@/components/admin/PortalFragmentsEditor";

afterEach(() => { vi.clearAllMocks(); });

describe("Fotos das inspirações no painel", () => {
  it("envia uma foto real, oferece prévia e salva o link no fragmento existente", async () => {
    render(<PortalFragmentsEditor portalId="portal-1" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Editar" }))[0]!);
    const file = new File(["imagem"], "vela-leao.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Enviar foto da inspiração"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^inspiracoes\/portal-1\/.+vela-leao.webp$/),
      file,
      { upsert: false },
    ));
    expect(await screen.findByAltText("Prévia da foto cadastrada")).toHaveAttribute(
      "src", "https://cdn.example/hiraeth-foto.webp",
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar conteúdo" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        portal_id: "portal-1",
        title: "Casa do Leão",
        image_url: "https://cdn.example/hiraeth-foto.webp",
        caption: "Casa do Leão",
      }),
    ));
  });
});
