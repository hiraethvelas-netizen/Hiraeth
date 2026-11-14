import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: { mode: "signup", source: "portal-nfc", redirect: "/portal/o-mundo-de-magia" },
  navigate: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useSearch: () => mocks.search }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { signUp: mocks.signUp, signInWithPassword: mocks.signInWithPassword },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route } from "@/routes/auth";

const AuthPage = Route.options.component!;
const key = "hiraeth:nfc:pending-token";
const token = "f".repeat(64);
let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  mocks.search = { mode: "signup", source: "portal-nfc", redirect: "/portal/o-mundo-de-magia" };
  window.sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

async function hydrateAuth() {
  let html: string;
  vi.stubGlobal("window", undefined);
  try {
    html = renderToString(<AuthPage />);
  } finally {
    vi.unstubAllGlobals();
  }
  expect(html).not.toContain("Escolha sua casa");
  container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const recoverableErrors: unknown[] = [];
  await act(async () => {
    root = hydrateRoot(container!, <AuthPage />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
  });
  expect(recoverableErrors).toEqual([]);
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.signUp).not.toHaveBeenCalled();
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
}

describe("Cadastro NFC: hidratação preserva o código sem ativá-lo", () => {
  it("mostra as casas após hidratar, sem divergir do HTML do servidor", async () => {
    window.sessionStorage.setItem(key, token);
    await hydrateAuth();
    expect(screen.getByRole("group", { name: "Escolha sua casa" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(key)).toBe(token);
    expect(screen.getByPlaceholderText("Seu nome")).toHaveValue("");
    expect(screen.getByPlaceholderText("seu@email.com")).toHaveValue("");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("não mostra casas em um cadastro comum, mesmo com código pendente", async () => {
    mocks.search.source = "";
    window.sessionStorage.setItem(key, token);
    await hydrateAuth();
    expect(screen.queryByRole("group", { name: "Escolha sua casa" })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(key)).toBe(token);
  });

  it.each(["", "invalid-code", "A".repeat(64)])(
    "mantém o formulário sem casas para código ausente ou inválido (%s)",
    async (value) => {
      if (value) window.sessionStorage.setItem(key, value);
      await hydrateAuth();
      expect(screen.queryByRole("group", { name: "Escolha sua casa" })).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem(key)).toBe(value || null);
    },
  );
});
