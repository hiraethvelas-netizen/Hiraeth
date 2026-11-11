import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: {} as { categoria?: string },
  banners: [] as { id: string; title: string; image_url: string; href: string }[],
  categoryLoad: vi.fn(),
  reads: vi.fn(),
  pageBanner: "",
}));

const categories = [
  { id: "books", name: "Livros", slug: "livros", parent_id: null },
  { id: "hp", name: "Harry Potter", slug: "harry-potter", parent_id: "books" },
];

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useSearch: () => mocks.search }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/admin-edit", () => ({
  useAdminEdit: () => ({ editing: false, isAdmin: false, editMode: false }),
  useSiteContent: (key: string, defaults: Record<string, unknown>) => [
    key === "store-page-settings"
      ? { ...defaults, showBanner: true, bannerImage: mocks.pageBanner }
      : key === "category-banner-hp"
        ? { ...defaults, bannerImage: "/harry-potter-banner.jpg" }
        : defaults,
    vi.fn(),
  ],
}));
vi.mock("@/hooks/use-collection-visibility", () => ({
  useCollectionVisibility: () => ({
    settings: { showSection: true, visibleCategoryIds: ["hp"] },
    loading: false,
    error: false,
  }),
}));
vi.mock("@/components/InlineEditor", () => ({ InlineEditor: () => null }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/components/AcervoNavigation", () => ({ AcervoNavigation: () => null }));
vi.mock("@/components/CustomerReviews", () => ({ CustomerReviews: () => null }));
vi.mock("@/components/SecretFlamesPromotion", () => ({ SecretFlamesPromotion: () => null }));
vi.mock("@/components/CuratedProductGrid", () => ({ CuratedProductGrid: () => null }));
vi.mock("@/lib/use-store-promotions", () => ({
  useStorePromotions: () => ({ promotions: [], categories: [] }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: (table: string) => {
      mocks.reads(table);
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          const result =
            table === "categories"
              ? mocks.categoryLoad()
              : Promise.resolve({
                  data: table === "site_banners" ? mocks.banners : [],
                  error: null,
                });
          return result.then(resolve, reject);
        },
      };
      return query;
    },
  },
}));

import { StoreBanners } from "@/components/StoreBanners";
import { Route } from "@/routes/loja";

const Store = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = {};
  mocks.banners = [];
  mocks.pageBanner = "";
  mocks.categoryLoad.mockResolvedValue({ data: categories, error: null });
});
afterEach(cleanup);

describe("Banners do Acervo sem repetição", () => {
  it("mostra o título uma única vez quando o banner ainda não tem foto", async () => {
    mocks.banners = [
      { id: "hp", title: "Harry Potter", image_url: "", href: "/loja?categoria=harry-potter" },
    ];
    render(<StoreBanners />);
    await screen.findByText("Harry Potter");
    expect(screen.getAllByText("Harry Potter")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Harry Potter" })).toHaveAttribute(
      "href",
      "/loja?categoria=harry-potter",
    );
    expect(screen.getAllByText("Novos universos a descobrir")).toHaveLength(1);
  });

  it("preserva imagens, ordem e destinos de campanhas distintas", async () => {
    mocks.banners = [
      {
        id: "hp",
        title: "Harry Potter",
        image_url: "/hp.jpg",
        href: "/loja?categoria=harry-potter",
      },
      {
        id: "friends",
        title: "Friends",
        image_url: "/friends.jpg",
        href: "/loja?categoria=friends",
      },
    ];
    const { container } = render(<StoreBanners />);
    await screen.findByRole("img", { name: "Harry Potter" });
    expect(
      Array.from(container.querySelectorAll("[data-store-banner] img")).map((image) =>
        image.getAttribute("src"),
      ),
    ).toEqual(["/hp.jpg", "/friends.jpg"]);
    expect(screen.getByRole("img", { name: "Friends" }).closest("a")).toHaveAttribute(
      "href",
      "/loja?categoria=friends",
    );
    expect(mocks.banners).toHaveLength(2);
  });

  it("aguarda a categoria do link NFC antes de exibir o banner correto", async () => {
    mocks.search = { categoria: "harry-potter" };
    mocks.pageBanner = "/store-banner.jpg";
    let resolveCategories!: (value: { data: typeof categories; error: null }) => void;
    mocks.categoryLoad.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCategories = resolve;
        }),
    );
    render(<Store />);
    expect(screen.queryByRole("region", { name: "Novidades da loja" })).not.toBeInTheDocument();
    expect(screen.queryByAltText("Banner da loja Hiraeth")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.categoryLoad).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveCategories({ data: categories, error: null });
    });
    expect(
      await screen.findByRole("img", { name: "Banner da coleção Harry Potter" }),
    ).toHaveAttribute("src", "/harry-potter-banner.jpg");
    expect(screen.getAllByRole("img", { name: "Banner da coleção Harry Potter" })).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Novidades da loja" })).not.toBeInTheDocument();
    expect(screen.queryByAltText("Banner da loja Hiraeth")).not.toBeInTheDocument();
    expect(mocks.reads).not.toHaveBeenCalledWith("site_banners");
  });

  it("mantém os banners gerais ao abrir o Acervo sem categoria", async () => {
    mocks.pageBanner = "/store-banner.jpg";
    mocks.banners = [{ id: "news", title: "Novidade", image_url: "/news.jpg", href: "/loja" }];
    render(<Store />);
    expect(await screen.findByRole("img", { name: "Novidade" })).toHaveAttribute(
      "src",
      "/news.jpg",
    );
    expect(screen.getByAltText("Banner da loja Hiraeth")).toHaveAttribute(
      "src",
      "/store-banner.jpg",
    );
    expect(screen.queryByAltText("Banner da coleção Harry Potter")).not.toBeInTheDocument();
  });

  it("preserva a apresentação geral quando o link informa uma categoria inexistente", async () => {
    mocks.search = { categoria: "inexistente" };
    render(<Store />);
    expect(await screen.findByRole("region", { name: "Novidades da loja" })).toBeInTheDocument();
    expect(screen.queryByAltText("Banner da coleção Harry Potter")).not.toBeInTheDocument();
  });
});
