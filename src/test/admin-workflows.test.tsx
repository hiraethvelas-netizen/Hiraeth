import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  rpc: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  storageUpload: vi.fn(),
  recipeError: false,
  content: { enabled: false, title: "Bem-vinda", message: "Olá", buttonText: "Entrar" },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/admin-edit", () => ({ useSiteContent: () => [mocks.content, vi.fn()] }));
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({ onApply, onCancel }: {
    onApply: (file: File) => Promise<void>;
    onCancel: () => void;
  }) => <div>
    <p>Prévia de recorte para teste</p>
    <button type="button" onClick={() => void onApply(new File(["recorte"], "recorte.webp", { type: "image/webp" }))}>Aplicar recorte</button>
    <button type="button" onClick={onCancel}>Voltar sem alterar</button>
  </div>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async (path: string, file: File) => {
          mocks.storageUpload(path, file);
          return { error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: "https://images.example/" + path } }),
      }),
    },
    rpc: async (name: string, payload: object) => {
      mocks.rpc(name, payload);
      return { error: mocks.recipeError ? { message: "Recipe refused" } : null };
    },
    from: (table: string) => {
      let action = "read";
      let payload: Record<string, unknown> = {};
      let single = false;
      const query = {
        select: () => query,
        limit: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: () => {
          single = true;
          return query;
        },
        single: () => {
          single = true;
          return query;
        },
        insert: (value: Record<string, unknown>) => {
          action = "insert";
          payload = value;
          mocks.mutation(table, action, value);
          return query;
        },
        upsert: (value: Record<string, unknown>) => {
          action = "upsert";
          payload = value;
          mocks.mutation(table, action, value);
          return query;
        },
        update: (value: Record<string, unknown>) => {
          action = "update";
          payload = value;
          mocks.mutation(table, action, value);
          return query;
        },
        then: (resolve: (value: object) => unknown) => {
          const rows: Record<string, unknown[]> = {
            products: [
              {
                id: "p1",
                name: "Vela",
                slug: "vela",
                price: 20,
                stock: 5,
                images: [],
                variants: [],
                status: "draft",
              },
            ],
            categories: [{ id: "hp", name: "Harry Potter", parent_id: null }],
            essences: [
              {
                id: "e1",
                name: "Baunilha",
                stock_ml: 100,
                active: true,
                is_pure: true,
                base_notes: ["Baunilha"],
              },
              {
                id: "e2",
                name: "Canela",
                stock_ml: 50,
                active: true,
                is_pure: true,
                heart_notes: ["Canela"],
              },
            ],
          };
          const data =
            action !== "read" ? { id: "saved", ...payload } : single ? null : (rows[table] ?? []);
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    },
  },
}));
import { Route as ProductsRoute } from "@/routes/admin/produtos";
import { Route as EssencesRoute } from "@/routes/admin/essencias";
import { Route as PromotionsRoute } from "@/routes/admin/promocoes";
const Products = ProductsRoute.options.component!,
  Essences = EssencesRoute.options.component!,
  Promotions = PromotionsRoute.options.component!;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.recipeError = false;
});
afterEach(cleanup);
async function newProduct() {
  render(<Products />);
  await screen.findByText("Vela");
  fireEvent.click(screen.getByRole("button", { name: "+ Novo produto" }));
  fireEvent.change(screen.getByLabelText("Nome", { exact: true }), {
    target: { value: "Minha vela" },
  });
  fireEvent.change(screen.getByLabelText("Preço (R$)", { exact: true }), {
    target: { value: "50" },
  });
}
async function addIngredient(name: string, quantity: string) {
  fireEvent.change(screen.getByLabelText("Aroma", { exact: true }), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Quantidade (ml)"), { target: { value: quantity } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
}
describe("Product and essence forms", () => {
  it("shows visual variations instead of an isolated candle-weight selector", async () => {
    await newProduct();
    expect(screen.queryByLabelText("Peso da vela")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar variação" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Um artefato"));
    expect(screen.queryByLabelText("Aroma", { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "products",
        "insert",
        expect.objectContaining({ product_type: "artifact" }),
      ),
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("saves fragrance ingredients and a 250 g candle option with no code field", async () => {
    await newProduct();
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar variação" }));
    fireEvent.change(screen.getByLabelText("Nome da variação"), { target: { value: "Peso" } });
    fireEvent.change(screen.getByLabelText("Opção 1 de Peso"), { target: { value: "250 g" } });
    await addIngredient("e1", "8");
    await addIngredient("e2", "2");
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("set_product_essences", {
        p_product_id: "saved",
        p_ingredients: [
          { essence_id: "e1", quantity_ml: 8 },
          { essence_id: "e2", quantity_ml: 2 },
        ],
      }),
    );
    expect(mocks.mutation).toHaveBeenCalledWith(
      "products",
      "insert",
      expect.objectContaining({
        product_type: "candle",
        variants: expect.arrayContaining([
          expect.objectContaining({ options: { Peso: "250 g" }, price: 50, stock: 0 }),
        ]),
      }),
    );
  });
  it("reports recipe failure without reporting complete product success", async () => {
    await newProduct();
    await addIngredient("e1", "8");
    mocks.recipeError = true;
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        expect.stringContaining("receita não foi atualizada"),
      ),
    );
    expect(mocks.success).not.toHaveBeenCalledWith("Produto criado.");
    expect(mocks.success).not.toHaveBeenCalledWith("Produto atualizado.");
    expect(screen.getByRole("button", { name: "Salvar produto" })).toBeInTheDocument();
  });
  it("creates a pure essence in stock from the product form", async () => {
    await newProduct();
    fireEvent.click(screen.getByText("+ Cadastrar um aroma novo"));
    fireEvent.change(screen.getByLabelText("Nome do aroma"), { target: { value: "Lavanda" } });
    fireEvent.change(screen.getByLabelText("Saldo inicial (ml)"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência no estoque" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "essences",
        "insert",
        expect.objectContaining({
          name: "Lavanda",
          stock_ml: 25,
          is_pure: true,
          heart_notes: ["Lavanda"],
        }),
      ),
    );
  });
  it("opens a crop preview before uploading the product picture and can adjust it again", async () => {
    await newProduct();
    fireEvent.change(screen.getByLabelText("+ Escolher imagens"), {
      target: { files: [new File(["foto"], "vela.png", { type: "image/png" })] },
    });
    expect(screen.getByText("Prévia de recorte para teste")).toBeInTheDocument();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.storageUpload).toHaveBeenCalledTimes(1));
    await screen.findByText("Imagem principal");
    expect(screen.getByRole("button", { name: "Ajustar foto" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ajustar foto" }));
    expect(screen.getByText("Prévia de recorte para teste")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar sem alterar" }));
    expect(screen.getByText("Imagem principal")).toBeInTheDocument();
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
  });

  it("crops a multiple-image selection one image at a time", async () => {
    await newProduct();
    fireEvent.change(screen.getByLabelText("+ Escolher imagens"), {
      target: { files: [
        new File(["foto1"], "vela-1.png", { type: "image/png" }),
        new File(["foto2"], "vela-2.png", { type: "image/png" }),
      ] },
    });
    expect(screen.getByText("Próximas fotos: 1. Ao aplicar ou cancelar, você passa para a próxima.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.storageUpload).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Prévia de recorte para teste")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.storageUpload).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Prévia de recorte para teste")).not.toBeInTheDocument();
    expect(screen.getByText("Imagem 2")).toBeInTheDocument();
  });

  it("stores the pyramid on the essence instead of requiring it for each candle", async () => {
    render(<Essences />);
    await screen.findByText("Baunilha", { selector: "p" });
    fireEvent.change(screen.getByLabelText("Nome da essência"), { target: { value: "Jardim" } });
    fireEvent.click(screen.getByLabelText("Essência pura"));
    fireEvent.change(screen.getByLabelText("Notas de saída"), {
      target: { value: "Laranja, Bergamota" },
    });
    fireEvent.change(screen.getByLabelText("Notas de corpo"), { target: { value: "Lavanda" } });
    fireEvent.change(screen.getByLabelText("Notas de fundo"), { target: { value: "Baunilha" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "essences",
        "insert",
        expect.objectContaining({
          is_pure: false,
          top_notes: ["Laranja", "Bergamota"],
          heart_notes: ["Lavanda"],
          base_notes: ["Baunilha"],
        }),
      ),
    );
  });
});
describe("Promotion editing", () => {
  it.each([
    ["categories", "Harry Potter", "eligible_category_ids", "hp"],
    ["products", "Vela", "eligible_product_ids", "p1"],
  ])("persists selected %s", async (scope, label, field, id) => {
    render(<Promotions />);
    await screen.findByRole("button", { name: "Salvar promoção" });
    fireEvent.change(screen.getByLabelText("Nome interno"), { target: { value: "Teste" } });
    fireEvent.change(screen.getByLabelText("Código do cupom"), { target: { value: "CUPOM" } });
    fireEvent.change(screen.getByLabelText("Alcance da promoção"), { target: { value: scope } });
    fireEvent.click(await screen.findByLabelText(label));
    fireEvent.click(screen.getByRole("button", { name: "Salvar promoção" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "promotions",
        "insert",
        expect.objectContaining({ all_products: false, [field]: [id] }),
      ),
    );
  });
  it("provides fixed candle cards and saves all four prizes without image URLs", async () => {
    render(<Promotions />);
    expect(screen.queryByText("URL da imagem")).not.toBeInTheDocument();
    const rewards = screen.getAllByLabelText("Nome do benefício");
    expect(rewards).toHaveLength(4);
    rewards.forEach((field, index) =>
      fireEvent.change(field, { target: { value: `Prêmio ${index + 1}` } }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração do Tarô da Fênix" }));
    await waitFor(() =>
      expect(mocks.mutation).toHaveBeenCalledWith(
        "secret_flame_rewards",
        "upsert",
        expect.arrayContaining([
          expect.objectContaining({ candle_index: 0, reward_title: "Prêmio 1" }),
          expect.objectContaining({ candle_index: 3, reward_title: "Prêmio 4" }),
        ]),
      ),
    );
  });
});
