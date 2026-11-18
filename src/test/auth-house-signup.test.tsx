import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: { mode: "signup" as string | undefined, redirect: "/portal/o-mundo-de-magia" as string | undefined, source: undefined as string | undefined },
  navigate: vi.fn(async (_to: unknown) => {}),
  signup: vi.fn(),
  login: vi.fn(),
  updateUser: vi.fn(async (_params: unknown) => ({ error: null })),
  upsert: vi.fn(async (_payload: unknown, _opts: unknown) => ({ error: null })),
  rpc: vi.fn(async (_name: string, _args: unknown) => ({ data: false, error: null })),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({ ...config, useSearch: () => mocks.search }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteHeader: () => null, SiteFooter: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: mocks.signup,
      signInWithPassword: mocks.login,
      updateUser: mocks.updateUser,
    },
    rpc: mocks.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { value: { enabled: false } }, error: null }),
        upsert: mocks.upsert,
      };
      return query;
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { Route } from "@/routes/auth";

const AuthPage = (Route as unknown as { component: React.ComponentType }).component;
const CUSTOMER = "new-customer-id";
function fillFields() {
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "ana@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Senha (mín. 6 caracteres)"), { target: { value: "example-password" } });
}

beforeEach(() => {
  mocks.search = { mode: "signup", redirect: "/portal/o-mundo-de-magia", source: undefined };
  mocks.navigate.mockClear();
  mocks.signup.mockReset();
  mocks.login.mockReset();
  mocks.updateUser.mockClear();
  mocks.upsert.mockClear();
  mocks.rpc.mockReset().mockResolvedValue({ data: false, error: null });
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

describe("Cadastro Hiraeth: casa independente de NFC", () => {
  it("offers houses on regular signup, saves the selected house and returns to the portal", async () => {
    mocks.signup.mockImplementation(async (input: any) => ({
      data: { user: { id: CUSTOMER, user_metadata: input.options.data }, session: { access_token: "mock" } },
      error: null,
    }));
    render(<AuthPage />);
    expect(screen.getByText(/Não é necessário ter um NFC/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Casa do Leão/));
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: CUSTOMER, house: "leao" }),
        { onConflict: "user_id" },
      );
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/portal/o-mundo-de-magia" });
    });
  });

  it("saves an undecided house and sends the new customer to the published 250g selector", async () => {
    mocks.signup.mockImplementation(async (input: any) => ({
      data: { user: { id: CUSTOMER, user_metadata: input.options.data }, session: { access_token: "mock" } },
      error: null,
    }));
    render(<AuthPage />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: CUSTOMER, house: null }),
        { onConflict: "user_id" },
      );
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/produto/a-seletora" });
    });
  });

  it("ignora tokens NFC antigos e salva a casa diretamente na conta", async () => {
    window.sessionStorage.setItem("hiraeth:nfc:pending-token", "a".repeat(64));
    mocks.signup.mockImplementation(async (input: any) => ({
      data: { user: { id: CUSTOMER, user_metadata: input.options.data }, session: { access_token: "mock" } },
      error: null,
    }));
    render(<AuthPage />);
    fireEvent.click(screen.getByLabelText(/Casa do Texugo/));
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/portal/o-mundo-de-magia" }));
    expect(mocks.signup.mock.calls[0]?.[0]?.options?.data).not.toHaveProperty("hiraeth_nfc_pending_token");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: CUSTOMER, house: "texugo" }), { onConflict: "user_id" });
    expect(mocks.rpc).not.toHaveBeenCalledWith("claim_house_nfc_access_code", expect.anything());
  });

  it("preserves the pending house through email confirmation and first login", async () => {
    let pendingMetadata: Record<string, unknown> = {};
    mocks.signup.mockImplementation(async (input: any) => {
      pendingMetadata = input.options.data;
      return { data: { user: { id: CUSTOMER, user_metadata: pendingMetadata }, session: null }, error: null };
    });
    mocks.login.mockImplementation(async () => ({
      data: { user: { id: CUSTOMER, user_metadata: pendingMetadata }, session: { access_token: "mock" } },
      error: null,
    }));
    render(<AuthPage />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await screen.findByText(/Sua conta foi criada/);
    expect(mocks.upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: CUSTOMER, house: null }),
        { onConflict: "user_id" },
      );
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/produto/a-seletora" });
    });
  });
});

describe("Login após cadastro e boas-vindas", () => {
  it("nunca retorna ao formulário de cadastro por um redirect antigo, nem consome a saudação antes da home", async () => {
    mocks.search = { mode: undefined, redirect: "/auth?mode=signup", source: undefined };
    mocks.login.mockResolvedValue({
      data: { user: { id: CUSTOMER, user_metadata: { hiraeth_welcome_pending: true } }, session: { access_token: "mock" } },
      error: null,
    });
    render(<AuthPage />);
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "ana@example.test" } });
    fireEvent.change(screen.getByPlaceholderText("Senha (mín. 6 caracteres)"), { target: { value: "example-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/inicio" }));
    expect(screen.queryByRole("dialog", { name: /boas-vindas/i })).not.toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalledWith({ data: { hiraeth_welcome_pending: false } });
  });
});
