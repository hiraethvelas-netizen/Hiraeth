import { useState, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  fragments: [
    { id: "house", position: 3, title: "Casa do Leão", body: "História da casa.", image_url: null },
    {
      id: "christmas-one",
      position: 8,
      title: "Entre Fios e Magia",
      body: "História preservada.",
      image_url: "https://cdn.example/original.png",
    },
    {
      id: "christmas-two",
      position: 9,
      title: "O Grande Salão",
      body: "Outra história.",
      image_url: null,
    },
  ],
  upload: vi.fn<(...args: unknown[]) => Promise<{ error: unknown }>>(),
  update: vi.fn<(...args: unknown[]) => Promise<{ error: unknown }>>(),
  cropFile: vi.fn<() => Promise<File>>(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("sonner", () => ({ toast: { success: fixtures.success, error: fixtures.error } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "portal-test", slug: "o-mundo-de-magia" },
            error: null,
          }),
          order: async () => ({
            data: fixtures.fragments.map((fragment) => ({ ...fragment })),
            error: null,
          }),
        }),
      }),
      update: (values: unknown) => ({
        eq: (field: string, id: string) => fixtures.update(table, values, field, id),
      }),
    }),
    storage: {
      from: () => ({
        upload: fixtures.upload,
        getPublicUrl: () => ({ data: { publicUrl: "https://cdn.example/adjusted.webp" } }),
      }),
    },
  },
}));

// Exercise the upload contract separately from canvas geometry, which is checked in the browser.
vi.mock("@/components/ImageCropEditor", () => ({
  ImageCropEditor: ({
    source,
    aspect,
    fit,
    onApply,
    onCancel,
  }: {
    source: string;
    aspect: string;
    fit: string;
    onApply: (file: File) => Promise<void>;
    onCancel: () => void;
  }) => {
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    return (
      <div data-testid="crop" data-source={source} data-aspect={aspect} data-fit={fit}>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError("");
            setBusy(true);
            try {
              await onApply(await fixtures.cropFile());
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Erro");
            } finally {
              setBusy(false);
            }
          }}
        >
          Aplicar recorte de teste
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Voltar sem alterar
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  },
}));

import { PortalInspiracoesAdmin } from "@/routes/admin/portal-inspiracoes";

beforeEach(() => {
  vi.clearAllMocks();
  fixtures.upload.mockResolvedValue({ error: null });
  fixtures.update.mockResolvedValue({ error: null });
  fixtures.cropFile.mockResolvedValue(
    new File(["cropped transparent pixels"], "hiraeth-recorte.webp", { type: "image/webp" }),
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.removeAttribute("open");
    },
  });
  document.body.style.overflow = "auto";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

async function openPhoto(title = "Entre Fios e Magia") {
  const trigger = await screen.findByRole("button", {
    name: "Ajustar zoom e enquadramento de " + title,
  });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole("dialog", { name: "Ajustar foto de " + title }) };
}

describe("Ajuste das fotos natalinas do Portal NFC", () => {
  it("abre a foto existente sem gravação e permite ajustar cada vela separadamente", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { trigger, dialog } = await openPhoto();
    expect(within(dialog).getByTestId("crop")).toHaveAttribute(
      "data-source",
      "https://cdn.example/original.png",
    );
    expect(within(dialog).getByTestId("crop")).toHaveAttribute("data-aspect", "portrait");
    expect(within(dialog).getByTestId("crop")).toHaveAttribute("data-fit", "contain");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar sem alterar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    expect(fixtures.upload).not.toHaveBeenCalled();
    expect(fixtures.update).not.toHaveBeenCalled();
    const second = await openPhoto("O Grande Salão");
    expect(within(second.dialog).getByTestId("crop").getAttribute("data-source")).toContain(
      "natal-grande-salao-recorte.webp",
    );
  });

  it("salva somente foto e legenda da vela escolhida, preservando os textos e a outra vela", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog } = await openPhoto();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte de teste" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fixtures.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^inspiracoes\/portal-test\/.+hiraeth-recorte.webp$/),
      expect.objectContaining({ name: "hiraeth-recorte.webp", type: "image/webp" }),
      { upsert: false },
    );
    expect(fixtures.update).toHaveBeenCalledExactlyOnceWith(
      "portal_fragments",
      {
        image_url: "https://cdn.example/adjusted.webp",
        caption: "Entre Fios e Magia",
      },
      "id",
      "christmas-one",
    );
    expect(screen.getByRole("img", { name: "Entre Fios e Magia" })).toHaveAttribute(
      "src",
      "https://cdn.example/adjusted.webp",
    );
    expect(screen.getByText("História preservada.")).toBeInTheDocument();
    expect(screen.getByText("Outra história.")).toBeInTheDocument();
    expect(fixtures.success).toHaveBeenCalledWith("Fotografia atualizada no Portal NFC.");
  });

  it("mantém Tab e Shift+Tab nos controles da janela", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog } = await openPhoto();
    const first = within(dialog).getByRole("button", { name: "Fechar ajuste da foto" });
    const last = within(dialog).getByRole("button", { name: "Voltar sem alterar" });
    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("mantém o envio da foto original sem recorte obrigatório", async () => {
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const input = await screen.findByLabelText("Trocar foto de Entre Fios e Magia");
    const original = new File(["original full resolution"], "foto-original.png", {
      type: "image/png",
    });
    fireEvent.change(input, { target: { files: [original] } });
    await waitFor(() =>
      expect(fixtures.upload).toHaveBeenCalledWith(expect.any(String), original, { upsert: false }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["Fechar ajuste da foto", "escape", "backdrop"])(
    "cancela por %s sem enviar arquivos",
    async (action) => {
      render(<PortalInspiracoesAdmin portalId="portal-test" />);
      const { dialog, trigger } = await openPhoto();
      if (action === "escape")
        fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
      else if (action === "backdrop") fireEvent.click(dialog);
      else fireEvent.click(within(dialog).getByRole("button", { name: action }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(fixtures.upload).not.toHaveBeenCalled();
    },
  );

  it("bloqueia fechamento durante o envio, apresenta falha na janela e permite tentar novamente", async () => {
    let failUpload!: (value: { error: unknown }) => void;
    fixtures.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          failUpload = resolve;
        }),
    );
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog } = await openPhoto();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte de teste" }));
    await waitFor(() => expect(fixtures.upload).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByRole("button", { name: "Fechar ajuste da foto" })).toBeDisabled();
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    fireEvent.click(dialog);
    expect(dialog).toBeInTheDocument();
    failUpload({ error: new Error("Falha fictícia de envio") });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Falha fictícia de envio");
    expect(fixtures.update).not.toHaveBeenCalled();
    expect(fixtures.error).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Entre Fios e Magia" })).toHaveAttribute(
      "src",
      "https://cdn.example/original.png",
    );
    expect(within(dialog).getByTestId("crop")).toHaveAttribute(
      "data-source",
      "https://cdn.example/original.png",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte de teste" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fixtures.update).toHaveBeenCalledTimes(1);
  });

  it("não troca a foto na tela nem informa sucesso quando salvar o fragmento falha", async () => {
    fixtures.update.mockResolvedValueOnce({ error: new Error("Falha fictícia ao salvar") });
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog } = await openPhoto();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte de teste" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Falha fictícia ao salvar");
    expect(screen.getByRole("img", { name: "Entre Fios e Magia" })).toHaveAttribute(
      "src",
      "https://cdn.example/original.png",
    );
    expect(fixtures.success).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
  });

  it("não envia o recorte que termina de ser gerado depois de cancelar a janela", async () => {
    let finishCrop!: (file: File) => void;
    fixtures.cropFile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCrop = resolve;
        }),
    );
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog, trigger } = await openPhoto();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar recorte de teste" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar ajuste da foto" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    finishCrop(new File(["late pixels"], "late.webp", { type: "image/webp" }));
    await waitFor(() => expect(fixtures.cropFile).toHaveResolvedTimes(1));
    expect(fixtures.upload).not.toHaveBeenCalled();
    expect(fixtures.update).not.toHaveBeenCalled();
    expect(fixtures.success).not.toHaveBeenCalled();
  });

  it("envia uma só vez com cliques repetidos em aplicar", async () => {
    let finishUpload!: (value: { error: unknown }) => void;
    fixtures.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve;
        }),
    );
    render(<PortalInspiracoesAdmin portalId="portal-test" />);
    const { dialog } = await openPhoto();
    const apply = within(dialog).getByRole("button", { name: "Aplicar recorte de teste" });
    fireEvent.click(apply);
    fireEvent.click(apply);
    await waitFor(() => expect(fixtures.upload).toHaveBeenCalledTimes(1));
    finishUpload({ error: null });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fixtures.upload).toHaveBeenCalledTimes(1);
    expect(fixtures.update).toHaveBeenCalledTimes(1);
  });
});
