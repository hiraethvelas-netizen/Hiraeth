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
vi.mock("@/routes/admin/portal-inspiracoes", () => ({
  PortalInspiracoesAdmin: () => <div>Editor de fotos integrado</div>,
}));
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
    expect(screen.getByRole("navigation", { name: "Editar seções do portal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fotos e inspirações" })).toBeInTheDocument();
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

  it("mostra o editor de fotografias dentro da aba Editar do portal NFC", async () => {
    render(<AdminPortais />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Fotos e inspirações" }));
    expect(screen.getByText("Editor de fotos integrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configurações do portal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar aos portais" }));
    expect(await screen.findByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByText("Editor de fotos integrado")).not.toBeInTheDocument();
  });

  it("mantém as opções avançadas recolhidas e preserva o tema ao salvar", async () => {
    render(<AdminPortais />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByRole("textbox", { name: "Nome do portal" })).toHaveValue("Nome original");
    expect(screen.getByRole("textbox", { name: "Vídeo de abertura (MP4)" })).toHaveValue(
      "/abertura.mp4",
    );
    expect(screen.getByRole("group", { name: "Dados do portal" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Abertura em vídeo" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Playlist" })).toBeInTheDocument();
    const summary = screen.getByText("Configurações avançadas");
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    const theme = {
      palette: { accent: "#c6a65b" },
      custom_setting: "preservar",
      carousel_items: [],
    };
    fireEvent.change(screen.getByLabelText("Paleta e opções do portal (JSON)"), {
      target: { value: JSON.stringify(theme) },
    });
    fireEvent.click(summary);
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ theme })),
    );
  });

  it("abre as opções avançadas e foca o JSON inválido sem salvar parcialmente", async () => {
    render(<AdminPortais />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const summary = screen.getByText("Configurações avançadas");
    fireEvent.click(summary);
    const theme = screen.getByLabelText("Paleta e opções do portal (JSON)");
    fireEvent.change(theme, { target: { value: "{" } });
    fireEvent.click(summary);
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(theme).toHaveFocus();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("cancela as alterações e retorna à lista sem persistir o rascunho", async () => {
    render(<AdminPortais />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nome do portal" }), {
      target: { value: "Nome ainda não salvo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Novo portal" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Configurações do portal" })).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
