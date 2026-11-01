import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rows: [] as {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    is_temporary?: boolean;
    starts_at?: string;
    ends_at?: string;
  }[],
  changed: () => {},
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => ({}),
  Link: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <a href="#" onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: async () => ({ data: mocks.rows, error: null }),
      };
      return q;
    },
    channel: () => ({
      on: (_type: string, _filter: object, callback: () => void) => {
        mocks.changed = callback;
        return { subscribe: () => ({}) };
      },
    }),
    removeChannel: vi.fn(),
  },
}));
import { AcervoNavigation } from "@/components/AcervoNavigation";
beforeEach(() => {
  mocks.rows = [
    { id: "candles", name: "Velas", slug: "velas", parent_id: null },
    { id: "hp", name: "Harry Potter", slug: "harry-potter", parent_id: "candles" },
  ];
});
afterEach(cleanup);
it("updates the open categories menu when categories are changed", async () => {
  render(<AcervoNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as categorias e subcategorias" }));
  expect(await screen.findByText("Harry Potter")).toBeInTheDocument();
  mocks.rows = [
    mocks.rows[0]!,
    { id: "verity", name: "Verity", slug: "verity", parent_id: "candles" },
  ];
  await act(async () => {
    mocks.changed();
  });
  expect(await screen.findByText("Verity")).toBeInTheDocument();
  expect(screen.queryByText("Harry Potter")).not.toBeInTheDocument();
});
it("shows a temporary badge for a parent category in the storefront menu", async () => {
  mocks.rows = [
    {
      id: "season",
      name: "Temporada",
      slug: "temporada",
      parent_id: null,
      is_temporary: true,
      starts_at: "2020-01-01",
      ends_at: "2100-01-01",
    },
  ];
  render(<AcervoNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as categorias e subcategorias" }));
  expect(await screen.findByText("Temporada")).toBeInTheDocument();
  expect(screen.getByText("Temporária")).toBeInTheDocument();
});
