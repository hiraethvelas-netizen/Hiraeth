import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AdminEditorDialog } from "./AdminEditorDialog";

describe("Admin editor dialog", () => {
  it("dismisses a nested photo notification without submitting its surrounding product form", async () => {
    const submit = vi.fn();
    const closeProduct = vi.fn();
    function Harness() {
      const [crop, setCrop] = useState(false);
      return (
        <AdminEditorDialog title="Editar produto" onClose={closeProduct}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <button type="button" onClick={() => setCrop(true)}>
              Recortar imagem
            </button>
            <button type="submit">Salvar produto</button>
            {crop && (
              <AdminEditorDialog title="Foto da variação" onClose={() => setCrop(false)}>
                Foto
              </AdminEditorDialog>
            )}
          </form>
        </AdminEditorDialog>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Recortar imagem" }));
    const crop = screen.getByRole("dialog", { name: "Foto da variação" });
    act(() => {
      toast.error("Falha ao enviar a foto da variação.");
    });
    expect(
      await within(crop).findByText("Falha ao enviar a foto da variação."),
    ).toBeInTheDocument();
    fireEvent.click(within(crop).getByRole("button", { name: "Fechar aviso" }));
    await waitFor(() =>
      expect(screen.queryByText("Falha ao enviar a foto da variação.")).not.toBeInTheDocument(),
    );
    expect(submit).not.toHaveBeenCalled();
    expect(closeProduct).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Foto da variação" })).toBeInTheDocument();
    fireEvent.click(within(crop).getByRole("button", { name: "Fechar Foto da variação" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Editar produto" })).getByRole("button", {
        name: "Salvar produto",
      }),
    );
    expect(submit).toHaveBeenCalledTimes(1);
    expect(closeProduct).not.toHaveBeenCalled();
  });

  it("keeps notifications in the top dialog only, including errors from nested controls", async () => {
    function Harness() {
      const [crop, setCrop] = useState(false);
      return (
        <AdminEditorDialog title="Editar produto" onClose={vi.fn()}>
          <button onClick={() => setCrop(true)}>Abrir recorte</button>
          {crop && (
            <AdminEditorDialog title="Recortar foto" onClose={() => setCrop(false)}>
              Recorte
            </AdminEditorDialog>
          )}
        </AdminEditorDialog>
      );
    }
    render(<Harness />);
    const parent = screen.getByRole("dialog", { name: "Editar produto" });
    expect(
      document.querySelectorAll('dialog section[aria-label^="Avisos do editor"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('section[aria-label^="Avisos do editor"]')?.closest("dialog"),
    ).toBe(parent);
    fireEvent.click(screen.getByRole("button", { name: "Abrir recorte" }));
    const child = screen.getByRole("dialog", { name: "Recortar foto" });
    expect(
      document.querySelectorAll('dialog section[aria-label^="Avisos do editor"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('section[aria-label^="Avisos do editor"]')?.closest("dialog"),
    ).toBe(child);
    let notification: string | number = "";
    act(() => {
      notification = toast.error("Não foi possível enviar a imagem.");
    });
    expect(await within(child).findByText("Não foi possível enviar a imagem.")).toBeInTheDocument();
    expect(screen.getAllByText("Não foi possível enviar a imagem.")).toHaveLength(1);
    act(() => {
      toast.dismiss(notification);
    });
    await waitFor(() =>
      expect(screen.queryByText("Não foi possível enviar a imagem.")).not.toBeInTheDocument(),
    );
    fireEvent.click(within(child).getByRole("button", { name: "Fechar Recortar foto" }));
    expect(
      document.querySelectorAll('dialog section[aria-label^="Avisos do editor"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('section[aria-label^="Avisos do editor"]')?.closest("dialog"),
    ).toBe(parent);
  });

  it("restores focus and the original scroll lock, closing only the nested photo dialog", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const [crop, setCrop] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Editar vela</button>
          {open && (
            <AdminEditorDialog title="Editar produto" onClose={() => setOpen(false)}>
              <input aria-label="Nome" defaultValue="Vela" />
              <button onClick={() => setCrop(true)}>Ajustar foto</button>
              {crop && (
                <AdminEditorDialog title="Recortar foto" onClose={() => setCrop(false)}>
                  Recorte
                </AdminEditorDialog>
              )}
            </AdminEditorDialog>
          )}
        </>
      );
    }
    document.body.style.overflow = "scroll";
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Editar vela" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Ajustar foto" }));
    const crop = screen.getByRole("dialog", { name: "Recortar foto" });
    fireEvent(crop, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog", { name: "Recortar foto" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Editar produto" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Editar produto" })).getByRole("button", {
        name: "Fechar Editar produto",
      }),
    );
    expect(document.body.style.overflow).toBe("scroll");
    expect(trigger).toHaveFocus();
    document.body.style.overflow = "";
  });

  it("does not close while a write is pending", () => {
    const onClose = vi.fn();
    render(
      <AdminEditorDialog title="Produto" busy onClose={onClose}>
        Salvando
      </AdminEditorDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Produto" });
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Fechar Produto" })).toBeDisabled();
  });
});
