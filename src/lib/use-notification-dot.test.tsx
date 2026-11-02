import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNotificationsViewedAt, markNotificationsViewed } from "./notifications";
import { useNotificationDot } from "./use-notification-dot";

const mocks = vi.hoisted(() => ({
  userId: "admin" as string | null,
  visible: true,
  createdAt: "" as string,
  listener: null as ((event: string, session: { user: { id: string } } | null) => void) | null,
  query: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({
        data: { user: mocks.userId ? { id: mocks.userId } : null }, error: null,
      }),
      onAuthStateChange: (callback: typeof mocks.listener) => {
        mocks.listener = callback;
        return { data: { subscription: { unsubscribe: () => { mocks.listener = null; } } } };
      },
    },
    from: (table: string) => {
      if (table !== "app_notifications") throw new Error("Wrong notifications table");
      return {
        select: (fields: string) => {
          if (fields !== "id,created_at") throw new Error("Header needs notification timestamp");
          return {
            order: (_field: string, _args: object) => ({
              limit: async (n: number) => {
                mocks.query(n);
                return {
                  data: mocks.visible ? [{ id: "notice", created_at: mocks.createdAt }] : [],
                  error: null,
                };
              },
            }),
          };
        },
      };
    },
  },
}));

function Indicator() {
  const hasNotification = useNotificationDot();
  return <output data-testid="notification-status">{hasNotification ? "sim" : "não"}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.userId = "admin";
  mocks.visible = true;
  mocks.createdAt = new Date(Date.now() - 10_000).toISOString();
  mocks.listener = null;
});

afterEach(() => {
  cleanup();
  mocks.listener = null;
});

describe("sininho de notificações da Hiraeth", () => {
  it("shows a dot for a new notification, without marking individual notices as read", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    expect(mocks.query).toHaveBeenCalledWith(1);
    expect(getNotificationsViewedAt("admin")).toBe(0);
  });

  it("has no dot when the account has no notifications", async () => {
    mocks.visible = false;
    render(<Indicator />);
    await waitFor(() => expect(mocks.query).toHaveBeenCalled());
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
  });

  it("removes the dot immediately on opening notifications, keeping the history untouched", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    act(() => markNotificationsViewed("admin"));
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
    expect(getNotificationsViewedAt("admin")).toBeGreaterThan(0);

    // Opening again or polling does not bring back older alerts.
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
  });

  it("brings the dot back when another notification arrives after the last opening", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    act(() => markNotificationsViewed("admin"));
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
    mocks.createdAt = new Date(Date.now() + 5000).toISOString();
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
  });

  it("does not reveal the previous account's notification state after switching accounts", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    act(() => markNotificationsViewed("admin"));
    act(() => {
      mocks.userId = null;
      mocks.listener?.("SIGNED_OUT", null);
    });
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
    expect(getNotificationsViewedAt("cliente")).toBe(0);

    act(() => {
      mocks.userId = "cliente";
      mocks.listener?.("SIGNED_IN", { user: { id: "cliente" } });
    });
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    expect(getNotificationsViewedAt("cliente")).toBe(0);
  });

  it("keeps the dot hidden for older notifications on a new page view", async () => {
    const first = render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    act(() => markNotificationsViewed("admin"));
    first.unmount();
    render(<Indicator />);
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
  });
});
