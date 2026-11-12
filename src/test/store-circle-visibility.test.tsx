import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  editing: false,
  search: {} as { categoria?: string },
  saved: null as unknown,
  load: vi.fn(),
  write: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  navigate: vi.fn(),
  categories: [
    { id: "books", name: "Livros", slug: "livros", parent_id: null, visible: true },
    { id: "hp", name: "Harry Potter", slug: "harry-potter", parent_id: "books", visible: true },
    { id: "friends", name: "Friends", slug: "friends", parent_id: "books", visible: true },
  ],
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useSearch: () => mocks.search }),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/admin-edit", () => ({
  useAdminEdit: () => ({ editing: mocks.editing }),
  useSiteContent: (_key: string, defaults: unknown) => [defaults, vi.fn()],
  uploadSiteImage: vi.fn(),
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/components/AcervoNavigation", () => ({
  AcervoNavigation: () => <nav>Menu do acervo preservado</nav>,
}));
vi.mock("@/components/StoreBanners", () => ({ StoreBanners: () => null }));
vi.mock("@/components/CustomerReviews", () => ({ CustomerReviews: () => null }));
vi.mock("@/components/SecretFlamesPromotion", () => ({ SecretFlamesPromotion: () => null }));
vi.mock("@/components/CategoryHeroBanner", () => ({
  CategoryHeroBanner: ({ category }: { category: { name: string } }) => (
    <h1>Coleção {category.name}</h1>
  ),
}));
vi.mock("@/components/CuratedProductGrid", () => ({
  CuratedProductGrid: ({ products }: { products: { id: string; name: string }[] }) => (
    <div>
      {products.map((product) => (
        <p key={product.id}>{product.name}</p>
      ))}
    </div>
  ),
}));
vi.mock("@/lib/use-store-promotions", () => ({
  useStorePromotions: () => ({ promotions: [], categories: [] }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: (table: string) => {
      let key = "";
      const query = {
        select: () => query,
        eq: (_name: string, value: string) => {
          key = value;
          return query;
        },
        order: async () => ({
          data:
            table === "categories"
              ? mocks.categories
              : [
                  {
                    id: "p-hp",
                    name: "Vela de Harry Potter",
                    category_id: "hp",
                    description: null,
                  },
                  {
                    id: "p-friends",
                    name: "Vela de Friends",
                    category_id: "friends",
                    description: null,
                  },
                ],
          error: null,
        }),
        maybeSingle: () => mocks.load(key),
        upsert: (payload: unknown) => mocks.write(table, payload),
      };
      return query;
    },
  },
}));

import { Route } from "@/routes/loja";
import { COLLECTION_VISIBILITY_KEY } from "@/hooks/use-collection-visibility";
const Store = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.editing = false;
  mocks.search = {};
  mocks.saved = { showSection: true, visibleCategoryIds: ["hp"] };
  mocks.categories = [
    { id: "books", name: "Livros", slug: "livros", parent_id: null, visible: true },
    { id: "hp", name: "Harry Potter", slug: "harry-potter", parent_id: "books", visible: true },
    { id: "friends", name: "Friends", slug: "friends", parent_id: "books", visible: true },
  ];
  mocks.load.mockImplementation(async () => ({
    data: mocks.saved == null ? null : { value: mocks.saved },
    error: null,
  }));
  mocks.write.mockImplementation(async (_table: string, payload: { value: unknown }) => {
    mocks.saved = payload.value;
    return { error: null };
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(cleanup);

async function openOptions() {
  fireEvent.click(await screen.findByRole("button", { name: "Editar bolinhas de subcategorias" }));
  return screen.getByRole("dialog", { name: "Editar bolinhas de subcategorias" });
}

describe("Bolinhas das subcategorias na loja", () => {
  it("abre categorias diferentes sem conflito entre banner e lista de produtos", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      mocks.search = { categoria: "harry-potter" };
      const { rerender } = render(<Store />);
      expect(
        await screen.findByRole("heading", { name: "Coleção Harry Potter" }),
      ).toBeInTheDocument();
      mocks.search = { categoria: "friends" };
      rerender(<Store />);
      expect(await screen.findByRole("heading", { name: "Coleção Friends" })).toBeInTheDocument();
      expect(errors.mock.calls.filter((call) => /same key/i.test(String(call[0])))).toHaveLength(0);
    } finally {
      errors.mockRestore();
    }
  });

  it("aguarda a configuração sem revelar bolinhas ocultas e mantém os produtos", async () => {
    let resolve!: (value: unknown) => void;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise((complete) => {
          resolve = complete;
        }),
    );
    render(<Store />);
    expect(await screen.findByText("Vela de Friends")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Coleções em destaque" })).not.toBeInTheDocument();
    await act(async () => {
      resolve({ data: { value: mocks.saved }, error: null });
    });
    expect(await screen.findByRole("button", { name: "Harry Potter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Friends" })).not.toBeInTheDocument();
    expect(screen.getByText("1 universo")).toBeInTheDocument();
    expect(screen.getByText("Menu do acervo preservado")).toBeInTheDocument();
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it.each([
    { saved: null, names: ["Harry Potter", "Friends"], count: "2 universos" },
    {
      saved: { showSection: true, visibleCategoryIds: null },
      names: ["Harry Potter", "Friends"],
      count: "2 universos",
    },
    { saved: { showSection: false, visibleCategoryIds: ["hp"] }, names: [], count: null },
    { saved: { showSection: true, visibleCategoryIds: [] }, names: [], count: null },
  ])("respeita opções salvas sem alterar categorias: $saved", async ({ saved, names, count }) => {
    mocks.saved = saved;
    render(<Store />);
    await screen.findByText("Vela de Harry Potter");
    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith(COLLECTION_VISIBILITY_KEY));
    const visibleNames: readonly string[] = names;
    for (const name of ["Harry Potter", "Friends"]) {
      expect(Boolean(screen.queryByRole("button", { name }))).toBe(visibleNames.includes(name));
    }
    if (count) expect(screen.getByText(count)).toBeInTheDocument();
    else
      expect(
        screen.queryByRole("region", { name: "Coleções em destaque" }),
      ).not.toBeInTheDocument();
  });

  it("mantém acessível o controle da área oculta e salva somente sua configuração", async () => {
    mocks.editing = true;
    mocks.saved = {
      showSection: false,
      visibleCategoryIds: ["not-currently-available"],
      otherSetting: "preserved",
    };
    const view = render(<Store />);
    const dialog = await openOptions();
    expect(
      within(dialog).getByLabelText("Exibir a área das bolinhas para os clientes"),
    ).not.toBeChecked();
    fireEvent.click(within(dialog).getByLabelText("Exibir a área das bolinhas para os clientes"));
    fireEvent.click(within(dialog).getByLabelText("Exibir bolinha de Harry Potter"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Harry Potter" })).toBeInTheDocument();
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(mocks.write).toHaveBeenCalledWith(
      "site_content",
      expect.objectContaining({
        key: COLLECTION_VISIBILITY_KEY,
        value: {
          showSection: true,
          visibleCategoryIds: ["not-currently-available", "hp"],
          otherSetting: "preserved",
        },
      }),
    );
    view.unmount();
    mocks.editing = false;
    render(<Store />);
    expect(await screen.findByRole("button", { name: "Harry Potter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Friends" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar bolinhas de subcategorias" }),
    ).not.toBeInTheDocument();
  });

  it("aguarda o salvamento e mantém a configuração e o formulário quando ele falha", async () => {
    mocks.editing = true;
    let finish!: (result: unknown) => void;
    mocks.write.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<Store />);
    const dialog = await openOptions();
    fireEvent.click(within(dialog).getByLabelText("Exibir bolinha de Friends"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(within(dialog).getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Friends" })).not.toBeInTheDocument();
    await act(async () => {
      finish({ error: new Error("Sem conexão") });
    });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Sem conexão"));
    expect(within(dialog).getByLabelText("Exibir bolinha de Friends")).toBeChecked();
    expect(screen.queryByRole("button", { name: "Friends" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Friends" })).toBeInTheDocument();
  });

  it("não revela bolinhas quando a consulta falha e permite tentar novamente", async () => {
    mocks.editing = true;
    mocks.load.mockRejectedValueOnce(new Error("Falha de rede"));
    render(<Store />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as opções",
    );
    expect(screen.queryByRole("button", { name: "Harry Potter" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar carregar as opções novamente" }));
    expect(await screen.findByRole("button", { name: "Harry Potter" })).toBeInTheDocument();
  });

  it("permite abrir uma categoria cuja bolinha está oculta", async () => {
    mocks.search = { categoria: "friends" };
    render(<Store />);
    expect(await screen.findByRole("heading", { name: "Coleção Friends" })).toBeInTheDocument();
    expect(screen.getByText("Vela de Friends")).toBeInTheDocument();
    expect(screen.queryByText("Vela de Harry Potter")).not.toBeInTheDocument();
  });

  it("oferece novas subcategorias sem exibi-las automaticamente na seleção explícita", async () => {
    mocks.editing = true;
    mocks.categories.push({
      id: "new",
      name: "Nova coleção",
      slug: "nova-colecao",
      parent_id: "books",
      visible: true,
    });
    render(<Store />);
    const dialog = await openOptions();
    expect(within(dialog).getByLabelText("Exibir bolinha de Nova coleção")).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Nova coleção" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Exibir bolinha de Nova coleção"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Nova coleção" })).toBeInTheDocument();
  });

  it("ignora uma leitura antiga quando a administradora já salvou novas opções", async () => {
    mocks.editing = true;
    render(<Store />);
    const dialog = await openOptions();
    let finishOldRead!: (result: unknown) => void;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldRead = resolve;
        }),
    );
    fireEvent.focus(window);
    fireEvent.click(within(dialog).getByLabelText("Exibir bolinha de Friends"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Friends" })).toBeInTheDocument();
    await act(async () => {
      finishOldRead({
        data: { value: { showSection: false, visibleCategoryIds: [] } },
        error: null,
      });
    });
    expect(screen.getByRole("button", { name: "Friends" })).toBeInTheDocument();
    expect(screen.getByText("2 universos")).toBeInTheDocument();
  });

  it("preserva a seleção de uma categoria que chega enquanto o editor está aberto", async () => {
    mocks.editing = true;
    const harryPotter = mocks.categories[1]!;
    mocks.categories = [mocks.categories[0]!, mocks.categories[2]!];
    render(<Store />);
    const dialog = await openOptions();
    expect(
      within(dialog).queryByLabelText("Exibir bolinha de Harry Potter"),
    ).not.toBeInTheDocument();
    mocks.categories.push(harryPotter);
    fireEvent.focus(window);
    await within(dialog).findByLabelText("Exibir bolinha de Harry Potter");
    fireEvent.click(within(dialog).getByLabelText("Exibir a área das bolinhas para os clientes"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith(
        "site_content",
        expect.objectContaining({
          key: COLLECTION_VISIBILITY_KEY,
          value: { showSection: false, visibleCategoryIds: ["hp"] },
        }),
      ),
    );
  });
  it("centraliza a única coleção, curva o nome e permite salvar duas bolinhas por fileira", async () => {
    mocks.editing = true;
    render(<Store />);
    const onlyCollection = await screen.findByRole("button", { name: "Harry Potter" });
    expect(onlyCollection.querySelector("svg.hiraeth-collection-arc textPath")).toHaveTextContent("Harry Potter");
    const dialog = await openOptions();
    const select = within(dialog).getByLabelText("Posição das bolinhas");
    expect(select).toHaveValue("center");
    fireEvent.change(select, { target: { value: "two" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledWith(
      "site_content",
      expect.objectContaining({
        key: COLLECTION_VISIBILITY_KEY,
        value: expect.objectContaining({ circleLayout: "two", visibleCategoryIds: ["hp"] }),
      }),
    ));
    expect(await screen.findByRole("button", { name: "Harry Potter" })).toBeInTheDocument();
  });

});
