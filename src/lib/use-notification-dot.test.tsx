import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationDot } from "./use-notification-dot";

const mocks = vi.hoisted(() => ({
  userId: "admin" as string | null,
  visible: true,
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
          if (fields !== "id") throw new Error("Header should only request ID");
          return {
            limit: async (n: number) => {
              mocks.query(n);
              return { data: mocks.visible ? [{ id: "notice" }] : [], error: null };
            },
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
  mocks.userId = "admin";
  mocks.visible = true;
  mocks.listener = null;
});

afterEach(() => {
  cleanup();
  mocks.listener = null;
});

describe("sininho de notificações da Hiraeth", () => {
  it("shows a dot when there are any notifications, without marking them as read", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    expect(mocks.query).toHaveBeenCalledWith(1);
  });

  it("does not show the dot when the account has no notifications", async () => {
    mocks.visible = false;
    render(<Indicator />);
    await waitFor(() => expect(mocks.query).toHaveBeenCalled());
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
  });

  it("clears the indicator when leaving one account, then checks the new account", async () => {
    render(<Indicator />);
    await waitFor(() => expect(screen.getByTestId("notification-status")).toHaveTextContent("sim"));
    act(() => {
      mocks.userId = null;
      mocks.listener?.("SIGNED_OUT", null);
    });
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");

    act(() => {
      mocks.visible = false;
      mocks.userId = "cliente";
      mocks.listener?.("SIGNED_IN", { user: { id: "cliente" } });
    });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("notification-status")).toHaveTextContent("não");
  });
});
