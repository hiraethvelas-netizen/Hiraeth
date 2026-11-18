import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerWelcomeDialog } from "@/components/CustomerWelcomeDialog";
import { getSafeInternalRedirect } from "@/lib/auth-routing";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  load: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, updateUser: mocks.updateUser },
    from: (_name: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: mocks.load,
      };
      return query;
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateUser.mockResolvedValue({ data: {}, error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "customer-1", user_metadata: { hiraeth_welcome_pending: true } } },
    error: null,
  });
  mocks.load.mockResolvedValue({
    data: { value: { enabled: true, title: "A chama da Hiraeth te recebe", message: "Que bom ter você aqui.", buttonText: "Seguir para o início" } },
    error: null,
  });
});
afterEach(cleanup);

describe("Primeiro login: boas-vindas na página inicial", () => {
  it("abre a mensagem somente após sessão autenticada e fecha sem voltar ao cadastro", async () => {
    render(<main><h1>Página inicial</h1><CustomerWelcomeDialog /></main>);
    expect(await screen.findByRole("dialog", { name: "Mensagem de boas-vindas" })).toBeInTheDocument();
    expect(screen.getByText("Página inicial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seguir para o início" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Página inicial")).toBeInTheDocument();
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ data: { hiraeth_welcome_pending: false } }));
  });

  it("não mostra boas-vindas para quem já as viu", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "customer-1", user_metadata: { hiraeth_welcome_pending: false } } }, error: null });
    render(<CustomerWelcomeDialog />);
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalledTimes(1));
    expect(mocks.load).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("não bloqueia a home se a saudação estiver desativada", async () => {
    mocks.load.mockResolvedValue({ data: { value: { enabled: false } }, error: null });
    render(<CustomerWelcomeDialog />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Destinos seguros de autenticação", () => {
  it("não redireciona uma conta recém-autenticada para a tela de cadastro", () => {
    expect(getSafeInternalRedirect("/auth")).toBe("/inicio");
    expect(getSafeInternalRedirect("/auth?mode=signup")).toBe("/inicio");
    expect(getSafeInternalRedirect("/auth?redirect=%2Finicio")).toBe("/inicio");
  });
  it("preserva o retorno legítimo ao portal NFC", () => {
    expect(getSafeInternalRedirect("/portal/o-mundo-de-magia")).toBe("/portal/o-mundo-de-magia");
  });
});
