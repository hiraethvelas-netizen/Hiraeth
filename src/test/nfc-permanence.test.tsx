import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), success: vi.fn() }));
const publishedPortal = {
  id: "portal-permanente",
  slug: "o-mundo-de-magia",
  name: "Nome original",
  universe: "Magia",
  status: "published",
  intro_enabled: true,
  intro_duration_ms: 3000,
  intro_video_url: "/abertura.mp4",
  theme: {},
  spotify_visible: false,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/admin/PortalFragmentsEditor", () => ({ PortalFragmentsEditor: () => null }));
vi.mock("@/components/admin/PortalGalleryEditor", () => ({ PortalGalleryEditor: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: mocks.success } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: async () => ({ data: table === "portals" ? [publishedPortal] : [], error: null }),
        update: (payload: object) => {
          mocks.update(payload);
          return {
            eq: (column: string, id: string) => {
              mocks.eq(column, id);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/admin/portais";
const AdminPortais = Route.options.component!;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NFC: endereço permanente de portais publicados", () => {
  it("preserva o link gravado nas velas ao editar nome e vídeo", async () => {
    render(<AdminPortais />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByText("/portal/o-mundo-de-magia", { selector: "span" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("combobox")[0]!.querySelector('option[value="published"]'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[0]).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Arquivar" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Nome do portal"), {
      target: { value: "Novo nome visível" },
    });
    fireEvent.change(screen.getByPlaceholderText("URL do vídeo de abertura (MP4)"), {
      target: { value: "/nova-abertura.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Portal atualizado."));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Novo nome visível",
        intro_video_url: "/nova-abertura.mp4",
        status: "published",
        intro_enabled: true,
      }),
    );
    expect(mocks.update.mock.calls[0]![0]).not.toHaveProperty("slug");
    expect(mocks.eq).toHaveBeenCalledWith("id", publishedPortal.id);
  });
});
