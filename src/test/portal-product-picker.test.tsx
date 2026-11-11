import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contents: {} as Record<string, Record<string, unknown>>,
  portals: [
    { id: "magic", name: "O Mundo da Magia" },
    { id: "other", name: "Outro universo" },
  ],
  products: [] as {
    id: string;
    name: string;
    slug: string;
    images: string[];
    status: string;
    product_type: string | null;
  }[],
  queries: [] as { table: string; filters: Record<string, unknown> }[],
  writes: vi.fn(),
  success: vi.fn(),
  failRead: false,
  failWrite: false,
  conflict: null as null | (() => void),
  writeWait: null as Promise<void> | null,
  batchRead: null as
    | null
    | (() => Promise<{ data: { key: string; value: Record<string, unknown> }[]; error: null }>),
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let operation = "read";
      let payload: { key: string; value: Record<string, unknown> } | null = null;
      const query = {
        select: () => query,
        eq: (name: string, value: unknown) => {
          filters[name] = value;
          return query;
        },
        in: (name: string, value: unknown) => {
          filters[name] = value;
          return query;
        },
        order: () => query,
        maybeSingle: async () => ({
          data: mocks.contents[String(filters["key"])]
            ? { value: mocks.contents[String(filters["key"])] }
            : null,
          error: mocks.failRead ? { message: "offline" } : null,
        }),
        update: (row: NonNullable<typeof payload>) => {
          operation = "update";
          payload = row;
          return query;
        },
        insert: (row: NonNullable<typeof payload>) => {
          operation = "insert";
          payload = row;
          return query;
        },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          return Promise.resolve()
            .then(async () => {
              mocks.queries.push({ table, filters: { ...filters } });
              if (operation !== "read" && payload) {
                mocks.writes({ table, operation, payload, filters: { ...filters } });
                await mocks.writeWait;
                if (mocks.failWrite) return { data: null, error: { message: "permission denied" } };
                const change = mocks.conflict;
                mocks.conflict = null;
                change?.();
                if (operation === "insert" && mocks.contents[payload.key])
                  return { data: null, error: { code: "23505" } };
                if (
                  operation === "update" &&
                  JSON.stringify(mocks.contents[payload.key]) !== filters["value"]
                ) {
                  return { data: [], error: null };
                }
                mocks.contents[payload.key] = payload.value;
                return { data: [{ key: payload.key }], error: null };
              }
              if (mocks.failRead) return { data: null, error: { message: "offline" } };
              if (table === "portals") return { data: mocks.portals, error: null };
              if (table === "products") return { data: mocks.products, error: null };
              if (table === "site_content") {
                if (mocks.batchRead) return mocks.batchRead();
                const keys = filters["key"] as string[];
                return {
                  data: Object.entries(mocks.contents)
                    .filter(([key]) => keys.includes(key))
                    .map(([key, value]) => ({ key, value })),
                  error: null,
                };
              }
              throw new Error("Unexpected query: " + table);
            })
            .then(resolve, reject);
        },
      };
      return query;
    },
  },
}));

import { PortalProductPicker } from "@/components/admin/PortalProductPicker";
import {
  loadPortalProductCollection,
  portalProductsKey,
  setPortalProductSelected,
} from "@/lib/portal-products";

const product = {
  id: "candle",
  name: "Vela Seletora",
  status: "published",
  product_type: "candle",
};
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
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
afterAll(() => {
  if (originalShowModal)
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.contents = {};
  mocks.products = [];
  mocks.queries = [];
  mocks.failRead = false;
  mocks.failWrite = false;
  mocks.conflict = null;
  mocks.writeWait = null;
  mocks.batchRead = null;
});
afterEach(cleanup);

async function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: "Colocar Vela Seletora no portal NFC" }));
  const dialog = screen.getByRole("dialog", { name: "Portais NFC de Vela Seletora" });
  await within(dialog).findByRole("checkbox", { name: /O Mundo da Magia/ });
  return dialog;
}

describe("Seleção dos produtos exibidos no portal", () => {
  it("preserva campos existentes e adiciona/remove somente a associação do portal", async () => {
    mocks.contents[portalProductsKey("magic")] = { productIds: ["old"], layout: "preservado" };
    await setPortalProductSelected("magic", "candle", true);
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["old", "candle"],
      layout: "preservado",
    });
    await setPortalProductSelected("magic", "old", false);
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["candle"],
      layout: "preservado",
    });
    expect(mocks.writes.mock.calls.every(([call]) => call.table === "site_content")).toBe(true);
  });

  it("não substitui nenhuma escolha ao tentar incluir uma sexta vela", async () => {
    const original = { productIds: ["1", "2", "3", "4", "5"] };
    mocks.contents[portalProductsKey("magic")] = original;
    await expect(setPortalProductSelected("magic", "sixth", true)).rejects.toThrow(
      /já tem cinco velas/,
    );
    expect(mocks.contents[portalProductsKey("magic")]).toBe(original);
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("refaz uma leitura concorrente sem perder a escolha adicionada em outra edição", async () => {
    mocks.contents[portalProductsKey("magic")] = { productIds: ["old"], note: "mantida" };
    mocks.conflict = () => {
      mocks.contents[portalProductsKey("magic")] = {
        productIds: ["old", "concurrent"],
        note: "nova",
      };
    };
    await setPortalProductSelected("magic", "candle", true);
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["old", "concurrent", "candle"],
      note: "nova",
    });
    expect(mocks.writes).toHaveBeenCalledTimes(2);
  });

  it("preserva uma seleção criada entre a leitura e a primeira inclusão", async () => {
    mocks.conflict = () => {
      mocks.contents[portalProductsKey("magic")] = {
        productIds: ["concurrent"],
        label: "preservada",
      };
    };
    await setPortalProductSelected("magic", "candle", true);
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["concurrent", "candle"],
      label: "preservada",
    });
  });

  it("não informa sucesso quando a escrita falha", async () => {
    mocks.failWrite = true;
    await expect(setPortalProductSelected("magic", "candle", true)).rejects.toThrow(
      /Não foi possível salvar/,
    );
    expect(mocks.contents).toEqual({});
  });

  it("limita as consultas aos produtos publicados e mantém a ordem escolhida sem duplicatas", async () => {
    mocks.contents[portalProductsKey("magic")] = {
      productIds: ["b", "draft", "a", "b", "artifact", "c", "sixth"],
    };
    mocks.products = [
      {
        id: "a",
        name: "A",
        slug: "vela-a",
        images: ["/a.png"],
        status: "published",
        product_type: "candle",
      },
      {
        id: "b",
        name: "B",
        slug: "vela-b",
        images: ["/b.png"],
        status: "published",
        product_type: null,
      },
      {
        id: "draft",
        name: "Draft",
        slug: "draft",
        images: [],
        status: "draft",
        product_type: "candle",
      },
      {
        id: "artifact",
        name: "Artifact",
        slug: "artifact",
        images: [],
        status: "published",
        product_type: "artifact",
      },
      {
        id: "c",
        name: "C",
        slug: "vela-c",
        images: ["/current-photo.png"],
        status: "published",
        product_type: "candle",
      },
      {
        id: "sixth",
        name: "Sixth",
        slug: "sixth",
        images: [],
        status: "published",
        product_type: "candle",
      },
    ];
    const result = await loadPortalProductCollection("magic");
    expect(result.products.map((item) => item.id)).toEqual(["b", "a", "c", "sixth"]);
    expect(result.products[2]?.images).toEqual(["/current-photo.png"]);
    expect(mocks.queries.find((query) => query.table === "products")?.filters).toEqual({
      status: "published",
      id: ["b", "draft", "a", "artifact", "c", "sixth"],
    });
  });

  it("diferencia configuração ausente de uma seleção vazia e não oculta falha de leitura", async () => {
    expect(await loadPortalProductCollection("magic")).toEqual({ configured: false, products: [] });
    mocks.contents[portalProductsKey("magic")] = { productIds: [] };
    expect(await loadPortalProductCollection("magic")).toEqual({ configured: true, products: [] });
    mocks.failRead = true;
    await expect(loadPortalProductCollection("magic")).rejects.toThrow(/Não foi possível carregar/);
  });
});

describe("Controle por produto na administração", () => {
  it("mostra falha ao carregar os portais e permite tentar novamente", async () => {
    mocks.failRead = true;
    render(<PortalProductPicker product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "Colocar Vela Seletora no portal NFC" }));
    const dialog = screen.getByRole("dialog", { name: "Portais NFC de Vela Seletora" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os portais",
    );
    mocks.failRead = false;
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Tentar carregar portais novamente" }),
    );
    expect(await within(dialog).findByRole("checkbox", { name: /O Mundo da Magia/ })).toBeEnabled();
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("inclui em um portal sem alterar outro, confirma a escolha e a recupera ao reabrir", async () => {
    mocks.contents[portalProductsKey("other")] = { productIds: ["other-candle"] };
    render(<PortalProductPicker product={product} />);
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ }));
    await waitFor(() =>
      expect(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeChecked(),
    );
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({ productIds: ["candle"] });
    expect(mocks.contents[portalProductsKey("other")]).toEqual({ productIds: ["other-candle"] });
    fireEvent.click(within(dialog).getByRole("button", { name: "Concluir" }));
    const reopened = await openPicker();
    expect(within(reopened).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeChecked();
    fireEvent.click(within(reopened).getByRole("checkbox", { name: /O Mundo da Magia/ }));
    await waitFor(() =>
      expect(
        within(reopened).getByRole("checkbox", { name: /O Mundo da Magia/ }),
      ).not.toBeChecked(),
    );
  });

  it("bloqueia a sexta vela e preserva a possibilidade de retirar uma já selecionada", async () => {
    mocks.contents[portalProductsKey("magic")] = { productIds: ["1", "2", "3", "4", "5"] };
    mocks.contents[portalProductsKey("other")] = { productIds: ["candle", "2", "3", "4", "5"] };
    render(<PortalProductPicker product={product} />);
    const dialog = await openPicker();
    expect(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeDisabled();
    expect(within(dialog).getByRole("checkbox", { name: /Outro universo/ })).toBeEnabled();
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("permite retirar explicitamente uma seleção indisponível e liberar a quinta vaga", async () => {
    mocks.contents[portalProductsKey("magic")] = {
      productIds: ["deleted", "2", "3", "4", "5"],
      layout: "preservado",
    };
    render(<PortalProductPicker product={product} />);
    const dialog = await openPicker();
    const checkbox = within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ });
    expect(checkbox).toBeDisabled();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Retirar Produto indisponível (seleção 1) do portal O Mundo da Magia",
      }),
    );
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["2", "3", "4", "5"],
      layout: "preservado",
    });
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({
      productIds: ["2", "3", "4", "5", "candle"],
      layout: "preservado",
    });
    expect(mocks.writes.mock.calls.every(([call]) => call.table === "site_content")).toBe(true);
  });

  it("não deixa uma leitura atrasada ao reabrir desfazer a seleção recém-salva", async () => {
    let finishWrite!: () => void;
    mocks.writeWait = new Promise((resolve) => {
      finishWrite = resolve;
    });
    render(<PortalProductPicker product={product} />);
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ }));
    expect(await within(dialog).findByText("Salvando seleção...")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Concluir" }));

    let readStarted = false;
    let finishRead!: (value: {
      data: { key: string; value: Record<string, unknown> }[];
      error: null;
    }) => void;
    mocks.batchRead = () => {
      readStarted = true;
      return new Promise((resolve) => {
        finishRead = resolve;
      });
    };
    fireEvent.click(screen.getByRole("button", { name: "Colocar Vela Seletora no portal NFC" }));
    const reopened = screen.getByRole("dialog", { name: "Portais NFC de Vela Seletora" });
    await waitFor(() => expect(readStarted).toBe(true));
    await act(async () => {
      finishWrite();
    });
    expect(
      await within(reopened).findByRole("checkbox", { name: /O Mundo da Magia/ }),
    ).toBeChecked();
    await act(async () => {
      finishRead({ data: [], error: null });
    });
    expect(within(reopened).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeChecked();
    expect(within(reopened).queryByText("Carregando portais...")).not.toBeInTheDocument();
    expect(mocks.contents[portalProductsKey("magic")]).toEqual({ productIds: ["candle"] });
  });

  it("mantém a seleção anterior quando salvar falha e permite atualizar e tentar novamente", async () => {
    mocks.failWrite = true;
    render(<PortalProductPicker product={product} />);
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ })).not.toBeChecked();
    expect(mocks.success).not.toHaveBeenCalled();
    mocks.failWrite = false;
    fireEvent.click(within(dialog).getByRole("button", { name: "Atualizar seleção dos portais" }));
    await within(dialog).findByRole("checkbox", { name: /O Mundo da Magia/ });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ }));
    await waitFor(() =>
      expect(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeChecked(),
    );
  });

  it("não publica um rascunho e permite retirar uma associação antiga", async () => {
    mocks.contents[portalProductsKey("other")] = { productIds: ["candle"] };
    render(<PortalProductPicker product={{ ...product, status: "draft" }} />);
    const dialog = await openPicker();
    expect(within(dialog).getByRole("checkbox", { name: /O Mundo da Magia/ })).toBeDisabled();
    expect(within(dialog).getByRole("checkbox", { name: /Outro universo/ })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Outro universo/ }));
    await waitFor(() =>
      expect(within(dialog).getByRole("checkbox", { name: /Outro universo/ })).not.toBeChecked(),
    );
    expect(mocks.writes.mock.calls.every(([call]) => call.table === "site_content")).toBe(true);
  });
});
