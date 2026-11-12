import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  error: null as object | null,
  body: "Mensagem de teste",
  deleted: false,
  interests: [] as { id: string; title: string; interest_type: string }[],
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "test-user" } } }) },
    rpc: async () => ({ data: false }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
    from: (table: string) => {
      let single = false;
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        in: () => query,
        maybeSingle: () => {
          single = true;
          return query;
        },
        update: (payload: { body: string }) => {
          mocks.update(payload);
          if (!mocks.error) mocks.body = payload.body;
          return query;
        },
        delete: () => {
          mocks.remove();
          if (!mocks.error) mocks.deleted = true;
          return query;
        },
        then: (resolve: (result: object) => unknown) => {
          const rows: Record<string, unknown> = {
            community_interests: mocks.interests,
            community_memberships: { user_id: "test-user" },
            community_profiles: single
              ? { username: "Teste", library_visible: true }
              : [{ user_id: "test-user", username: "Teste" }],
            community_messages: mocks.deleted
              ? []
              : [
                  {
                    id: "test-own",
                    user_id: "test-user",
                    body: mocks.body,
                    created_at: "2026-11-01T12:00:00Z",
                  },
                  {
                    id: "test-other",
                    user_id: "other-user",
                    body: "Outra mensagem",
                    created_at: "2026-11-01T12:01:00Z",
                  },
                ],
          };
          return Promise.resolve({ data: rows[table] ?? [], error: mocks.error }).then(resolve);
        },
      };
      return query;
    },
  },
}));
import { Route } from "@/routes/_authenticated/comunidade";
const Community = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.error = null;
  mocks.body = "Mensagem de teste";
  mocks.deleted = false;
  mocks.interests = [];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
});

async function openChatMenu() {
  render(<Community />);
  fireEvent.click(await screen.findByRole("button", { name: "Chat" }));
  // Only the current author's message exposes editing/deletion options.
  const triggers = await screen.findAllByRole("button", { name: "Opções da mensagem" });
  expect(triggers).toHaveLength(1);
  fireEvent.keyDown(triggers[0]!, { key: "ArrowDown" });
  return screen.findByRole("menu");
}

describe.each(["light", "dark"])("Community chat (%s theme, mocked database)", (theme) => {
  it("opens the three-dot menu, edits an own message and closes editing", async () => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    await openChatMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar mensagem" }));
    fireEvent.change(screen.getByDisplayValue("Mensagem de teste"), {
      target: { value: "Texto atualizado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ body: "Texto atualizado" }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("Texto atualizado")).toBeInTheDocument();
  });

  it("requires confirmation before deleting an own message", async () => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
    await openChatMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Apagar mensagem" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    expect(confirmation).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Mensagem de teste")).not.toBeInTheDocument());
  });
});

it("shows the two-column mobile cover gallery in the original interest order", async () => {
  mocks.interests = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    title: `Livro ${index + 1}`,
    interest_type: "book",
  }));
  render(<Community />);
  fireEvent.click(await screen.findByRole("button", { name: "Meu perfil" }));
  fireEvent.click(screen.getByRole("button", { name: "Meu Universo" }));
  const cards = await screen.findAllByRole("button", { name: /Editar ou remover Livro/ });
  expect(cards).toHaveLength(7);
  expect(cards[0]?.parentElement?.className).toContain("grid-cols-2");
  expect(cards[0]?.parentElement?.className).toContain("sm:grid-cols-3");
  expect(cards.map(card => card.getAttribute("aria-label"))).toEqual(
    Array.from({ length: 7 }, (_, index) => `Editar ou remover Livro ${index + 1}`),
  );
});
