import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(async () => "https://cdn.test/hiraeth-recorte.webp"),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/admin-edit", () => ({
  useAdminEdit: () => ({ editing: true }),
  uploadSiteImage: mocks.upload,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({
    onApply, onCancel,
  }: { onApply: (file: File) => Promise<void>; onCancel: () => void }) => (
    <div>
      <p>Editor de recorte ativo</p>
      <button type="button" onClick={() => void onApply(new File(["recorte"], "recorte.webp", { type: "image/webp" }))}>Aplicar recorte</button>
      <button type="button" onClick={onCancel}>Voltar sem alterar</button>
    </div>
  ),
}));

import { InlineEditor } from "@/components/InlineEditor";

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);

describe("InlineEditor crop-enabled homepage images", () => {
  it("opens the crop editor first, then uploads and saves the adjusted photo", async () => {
    const save = vi.fn(async () => undefined);
    render(<InlineEditor
      label="atalho Loja"
      fields={[{ name: "image_key", label: "Imagem da bolinha", type: "image", cropAspect: "square" }]}
      values={{ image_key: "" }}
      onSave={save}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Editar atalho Loja" }));
    const uploadInput = screen.getByLabelText("Selecionar imagem da bolinha");
    const file = new File(["foto"], "foto.png", { type: "image/png" });
    const selected = Object.assign([file], { item: (index: number) => index === 0 ? file : null });
    fireEvent.change(uploadInput, { target: { files: selected } });
    expect(screen.getByText("Editor de recorte ativo")).toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ image_key: "https://cdn.test/hiraeth-recorte.webp" }));
  });

  it("preserves the original photo when the crop is canceled", async () => {
    const save = vi.fn(async () => undefined);
    const oldImage = "https://cdn.test/original.png";
    render(<InlineEditor
      label="atalho Loja"
      fields={[{ name: "image_key", label: "Imagem da bolinha", type: "image", cropAspect: "square" }]}
      values={{ image_key: oldImage }}
      onSave={save}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Editar atalho Loja" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajustar foto" }));
    expect(screen.getByText("Editor de recorte ativo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar sem alterar" }));
    expect(mocks.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ image_key: oldImage }));
  });
});
