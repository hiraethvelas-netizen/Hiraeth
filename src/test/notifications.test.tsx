import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { safeNotificationHref, notificationDate } from "@/lib/notifications";

const mocks = vi.hoisted(() => ({
  inserted: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  rows: [
    { id: "broadcast", kind: "announcement", title: "Cupom especial",
      body: "Confira o Acervo Hiraeth.", href: "/loja",
      created_at: "2026-11-02T00:00:00Z", recipient_id: null },
    { id: "reaction", kind: "reaction", title: "Sua publicação recebeu uma reação",
      body: "Alguém reagiu à sua publicação.", href: "/comunidade?tab=feed",
      created_at: "2026-11-01T20:00:00Z", recipient_id: "u1" },
  ],
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteHeader: () => null, SiteFooter: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        eq: () => query,
        is: () => query,
        limit: async () => ({ data: mocks.rows, error: null }),
        insert: (payload: unknown) => {
          mocks.inserted(payload);
          return { select: () => ({ single: async () => ({ data: { id: "saved" }, error: null }) }) };
        },
      };
      return query;
    },
  },
}));

import { Route as NotificationsRoute } from "@/routes/_authenticated/notificacoes";
import { Route as AdminRoute } from "@/routes/admin/notificacoes";

const Notifications = NotificationsRoute.options.component!;
const AdminNotifications = AdminRoute.options.component!;

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Sinais da Chama", () => {
  it("lists announcements and personal activity without read/unread controls", async () => {
    render(<Notifications />);
    expect(await screen.findByText("Cupom especial")).toBeInTheDocument();
    expect(screen.getByText("Sua publicação recebeu uma reação")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cupom especial/ })).toHaveAttribute("href", "/loja");
    expect(screen.getByRole("link", { name: /Sua publicação recebeu uma reação/ }))
      .toHaveAttribute("href", "/comunidade?tab=feed");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    // Labels and messages use explicitly contrasting colors on the cream cards,
    // independent of the light/dark theme inherited from the rest of the store.
    const title = screen.getByText("Cupom especial");
    expect(title.className).toContain("text-[#273b2b]");
    expect(screen.getByText("Confira o Acervo Hiraeth.").className).toContain("text-[#354933]");
    expect(title.closest("a")?.className).toContain("bg-[#f6eed9]");
  });

  it("restricts links to safe internal destinations", () => {
    expect(safeNotificationHref("javascript:alert(1)")).toBe("/inicio");
    expect(safeNotificationHref("https://fake.test")).toBe("/inicio");
    expect(safeNotificationHref("/comunidade?tab=chat")).toBe("/comunidade?tab=chat");
    expect(notificationDate("invalid")).toBe("");
  });

  it("requires admin confirmation before broadcasting and saves only a general notice", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminNotifications />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Uma chama especial" } });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Cupom disponível no Acervo!" } });
    fireEvent.change(screen.getByLabelText("Para onde a pessoa vai ao tocar no aviso?"),
      { target: { value: "/loja" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar para todos" }));
    await waitFor(() => expect(mocks.inserted).toHaveBeenCalledWith({
      actor_id: "u1", recipient_id: null, kind: "announcement",
      title: "Uma chama especial", body: "Cupom disponível no Acervo!", href: "/loja",
    }));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  });

  it("does not broadcast if the admin cancels confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminNotifications />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Aviso" } });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Olá" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar para todos" }));
    expect(mocks.inserted).not.toHaveBeenCalled();
  });
});
