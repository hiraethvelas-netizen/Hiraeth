import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  error: vi.fn(),
  welcome: null as unknown,
  startsAt: "",
  endsAt: "",
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.error } }));
vi.mock("@/lib/admin-edit", () => ({
  useSiteContent: (_key: string, defaults: unknown) => [
    mocks.welcome ?? (mocks.welcome = defaults),
    vi.fn(),
  ],
  uploadSiteImage: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      let writing = false;
      const query = {
        select: () => query,
        order: () => query,
        eq: () => query,
        limit: () => query,
        update: (payload: unknown) => {
          writing = true;
          mocks.mutation(table, payload);
          return query;
        },
        upsert: (payload: unknown) => {
          writing = true;
          mocks.mutation(table, payload);
          return query;
        },
        maybeSingle: () => query,
        then: (resolve: (result: unknown) => unknown) => {
          const schedule = { starts_at: mocks.startsAt || null, ends_at: mocks.endsAt || null };
          const data =
            table === "promotions"
              ? [
                  {
                    id: "scheduled-promotion",
                    name: "Promoção agendada",
                    kind: "automatic_discount",
                    active: false,
                    visible: false,
                    all_products: true,
                    discount_type: "percent",
                    discount_value: 10,
                    ...schedule,
                  },
                ]
              : table === "secret_flame_settings"
                ? { id: true, active: false, ...schedule }
                : [];
          return Promise.resolve({ data: writing ? null : data, error: null }).then(resolve);
        },
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/admin/promocoes";
const AdminPromotions = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.welcome = null;
  mocks.startsAt = new Date("2026-11-10T12:00").toISOString();
  mocks.endsAt = new Date("2026-11-11T16:30").toISOString();
});
afterEach(cleanup);

describe("Horários de promoção e Tarô", () => {
  it("não muda início/fim ao editar e salvar uma promoção", async () => {
    render(<AdminPromotions />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Início (opcional)")).toHaveValue("2026-11-10T12:00");
    expect(screen.getByLabelText("Fim (opcional)")).toHaveValue("2026-11-11T16:30");
    fireEvent.click(screen.getByRole("button", { name: "Salvar promoção" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "promotions",
        expect.objectContaining({ starts_at: mocks.startsAt, ends_at: mocks.endsAt }),
      ),
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("não muda início/fim ao salvar a configuração do Tarô", async () => {
    render(<AdminPromotions />);
    await waitFor(() =>
      expect(screen.getByLabelText("Início", { exact: true })).toHaveValue("2026-11-10T12:00"),
    );
    expect(screen.getByLabelText("Fim", { exact: true })).toHaveValue("2026-11-11T16:30");
    screen
      .getAllByLabelText("Nome do benefício")
      .forEach((field, index) =>
        fireEvent.change(field, { target: { value: `Prêmio ${index + 1}` } }),
      );
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração do Tarô da Fênix" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "secret_flame_settings",
        expect.objectContaining({ starts_at: mocks.startsAt, ends_at: mocks.endsAt }),
      ),
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("mantém a promoção sem agendamento quando as datas são nulas", async () => {
    mocks.startsAt = "";
    mocks.endsAt = "";
    render(<AdminPromotions />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Início (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Fim (opcional)")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Salvar promoção" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "promotions",
        expect.objectContaining({ starts_at: null, ends_at: null }),
      ),
    );
  });
});
