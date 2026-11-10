import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/integrations/supabase/types";

const mocks = vi.hoisted(() => ({
  content: {} as Record<string, Record<string, unknown>>,
  writes: vi.fn(),
  upload: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  failSave: false,
  editing: true,
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      expect(table).toBe("site_content");
      let key = "";
      const query = {
        select: () => query,
        eq: (_field: string, value: string) => {
          key = value;
          return query;
        },
        maybeSingle: async () => ({
          data: mocks.content[key] ? { value: mocks.content[key] } : null,
          error: null,
        }),
        upsert: async (row: { key: string; value: Record<string, unknown> }) => {
          mocks.writes(row);
          if (mocks.failSave) return { error: new Error("Falha no salvamento") };
          mocks.content[row.key] = row.value;
          return { error: null };
        },
      };
      return query;
    },
  },
}));
vi.mock("@/lib/admin-edit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-edit")>();
  return {
    ...actual,
    useAdminEdit: () => ({ editing: mocks.editing }),
    uploadSiteImage: mocks.upload,
  };
});
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({
    aspect,
    onApply,
    onCancel,
  }: {
    aspect: string;
    onApply: (file: File) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div role="group" aria-label="Ajustar foto do banner" data-aspect={aspect}>
      <button
        type="button"
        onClick={() =>
          void onApply(new File(["foto ajustada"], "banner.jpg", { type: "image/jpeg" }))
        }
      >
        Aplicar foto de teste
      </button>
      <button type="button" onClick={onCancel}>
        Cancelar ajuste
      </button>
    </div>
  ),
}));

import { CategoryHeroBanner } from "@/components/CategoryHeroBanner";

type Category = Tables<"categories">;
const category = {
  id: "hp",
  name: "Harry Potter",
  slug: "harry-potter",
  image_url: "https://example.com/bolinha-hp.jpg",
  is_temporary: false,
} as Category;
const nameChange = vi.fn(async () => {});
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
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
  mocks.content = {};
  mocks.failSave = false;
  mocks.editing = true;
  mocks.upload.mockResolvedValue("https://example.com/banner-novo.jpg");
});
afterEach(cleanup);

async function chooseBanner() {
  fireEvent.click(screen.getByRole("button", { name: "Editar banner da coleção Harry Potter" }));
  const file = new File(["foto"], "banner.jpg", { type: "image/jpeg" });
  const files = { 0: file, length: 1, item: () => file };
  fireEvent.change(screen.getByLabelText("Selecionar foto do banner (não altera a bolinha)"), {
    target: { files },
  });
  expect(screen.getByRole("group", { name: "Ajustar foto do banner" })).toHaveAttribute(
    "data-aspect",
    "landscape",
  );
  fireEvent.click(screen.getByRole("button", { name: "Aplicar foto de teste" }));
  await waitFor(() =>
    expect(screen.queryByRole("group", { name: "Ajustar foto do banner" })).not.toBeInTheDocument(),
  );
}

describe("Banner independente da bolinha da subcategoria", () => {
  it("não repete a imagem da bolinha quando não há banner próprio", async () => {
    const { container } = render(
      <CategoryHeroBanner category={category} onNameChange={nameChange} />,
    );
    await screen.findByRole("heading", { name: "Harry Potter" });
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(category.image_url).toBe("https://example.com/bolinha-hp.jpg");
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("mantém o banner configurado mesmo quando a bolinha muda", async () => {
    mocks.content["category-banner-hp"] = { bannerImage: "https://example.com/banner-hp.jpg" };
    const { rerender } = render(
      <CategoryHeroBanner category={category} onNameChange={nameChange} />,
    );
    const banner = await screen.findByAltText("Banner da coleção Harry Potter");
    expect(banner).toHaveAttribute("src", "https://example.com/banner-hp.jpg");
    rerender(
      <CategoryHeroBanner
        category={{ ...category, image_url: "https://example.com/bolinha-nova.jpg" }}
        onNameChange={nameChange}
      />,
    );
    expect(banner).toHaveAttribute("src", "https://example.com/banner-hp.jpg");
  });

  it("salva a foto ajustada apenas no banner e a recupera ao reabrir a página", async () => {
    mocks.content["category-banner-hp"] = { bannerImage: "", otherSetting: "preservada" };
    const { unmount } = render(
      <CategoryHeroBanner category={category} onNameChange={nameChange} />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Editar banner da coleção Harry Potter" }),
      ).toBeInTheDocument(),
    );
    await chooseBanner();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(mocks.writes).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "category-banner-hp",
          value: { bannerImage: "https://example.com/banner-novo.jpg", otherSetting: "preservada" },
        }),
      ),
    );
    expect(category.image_url).toBe("https://example.com/bolinha-hp.jpg");
    expect(nameChange).not.toHaveBeenCalled();
    unmount();
    render(<CategoryHeroBanner category={category} onNameChange={nameChange} />);
    expect(await screen.findByAltText("Banner da coleção Harry Potter")).toHaveAttribute(
      "src",
      "https://example.com/banner-novo.jpg",
    );
  });

  it("preserva o banner anterior e mantém o editor aberto se salvar falhar", async () => {
    mocks.content["category-banner-hp"] = {
      bannerImage: "https://example.com/banner-anterior.jpg",
    };
    mocks.failSave = true;
    render(<CategoryHeroBanner category={category} onNameChange={nameChange} />);
    await screen.findByAltText("Banner da coleção Harry Potter");
    await chooseBanner();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Falha no salvamento")),
    );
    expect(
      screen.getByRole("dialog", { name: "Editar banner da coleção Harry Potter" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Banner da coleção Harry Potter")).toHaveAttribute(
      "src",
      "https://example.com/banner-anterior.jpg",
    );
    expect(mocks.content["category-banner-hp"]?.["bannerImage"]).toBe(
      "https://example.com/banner-anterior.jpg",
    );
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("usa uma configuração diferente para cada subcategoria e preserva o selo temporário", async () => {
    mocks.content["category-banner-hp"] = { bannerImage: "https://example.com/banner-hp.jpg" };
    mocks.content["category-banner-friends"] = {
      bannerImage: "https://example.com/banner-friends.jpg",
    };
    const { rerender } = render(
      <CategoryHeroBanner key="hp" category={category} onNameChange={nameChange} />,
    );
    await screen.findByAltText("Banner da coleção Harry Potter");
    const friends = {
      ...category,
      id: "friends",
      name: "Friends",
      slug: "friends",
      is_temporary: true,
      ends_at: "2030-12-31",
    };
    rerender(<CategoryHeroBanner key="friends" category={friends} onNameChange={nameChange} />);
    expect(await screen.findByAltText("Banner da coleção Friends")).toHaveAttribute(
      "src",
      "https://example.com/banner-friends.jpg",
    );
    expect(screen.getByText(/Coleção temporária/)).toBeInTheDocument();
    expect(screen.queryByAltText("Banner da coleção Harry Potter")).not.toBeInTheDocument();
  });

  it("não mostra opções de edição para os clientes", async () => {
    mocks.editing = false;
    mocks.content["category-banner-hp"] = { bannerImage: "https://example.com/banner-hp.jpg" };
    render(<CategoryHeroBanner category={category} onNameChange={nameChange} />);
    await screen.findByAltText("Banner da coleção Harry Potter");
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });
});
