import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CandleBookshelf, type CandleLibraryItem } from "@/components/CandleBookshelf";

const candle: CandleLibraryItem = {
  id: "test-candle",
  title: "Vela de teste",
  aroma: "Baunilha",
  category: "Literatura",
  notes: "Lembrança de leitura",
  image_url: "https://example.test/candle.png",
};
afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
});

describe.each(["light", "dark"])(
  "Candle bookshelf interactions (%s theme, simulated DOM)",
  (theme) => {
    it("opens details, filters categories and closes the dialog", () => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      render(
        <CandleBookshelf
          items={[candle, { ...candle, id: "finished", title: "Vela acabada", finished: true }]}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes da vela Vela de teste" }));
      expect(screen.getByRole("dialog")).toHaveTextContent("Lembrança de leitura");
      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Acabaram" }));
      expect(
        screen.queryByRole("button", { name: "Abrir detalhes da vela Vela de teste" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Abrir detalhes da vela Vela acabada" }),
      ).toBeInTheDocument();
    });

    it("saves an edit and keeps the dialog open with the draft if saving fails", async () => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      const update = vi
        .fn()
        .mockRejectedValueOnce(new Error("Falha simulada"))
        .mockResolvedValueOnce(undefined);
      render(<CandleBookshelf items={[candle]} editable onUpdate={update} />);
      fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes da vela Vela de teste" }));
      fireEvent.click(screen.getByRole("button", { name: "Editar detalhes" }));
      fireEvent.change(screen.getByLabelText("Nome da vela"), {
        target: { value: "Nome atualizado" },
      });
      fireEvent.click(screen.getByRole("button", { name: "4 foguinhos" }));
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Falha simulada");
      expect(screen.getByLabelText("Nome da vela")).toHaveValue("Nome atualizado");
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(update).toHaveBeenLastCalledWith(
        candle.id,
        expect.objectContaining({ title: "Nome atualizado", rating: 4 }),
      );
    });

    it("preserves purchased candle restrictions until delivery and hides actions in public view", () => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      const action = vi.fn();
      const { rerender } = render(
        <CandleBookshelf
          items={[{ ...candle, order_item_id: "test-purchase", purchase_status: "shipped" }]}
          editable
          onUpdate={action}
          onRemove={action}
          onMarkFinished={action}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes da vela Vela de teste" }));
      expect(screen.queryByRole("button", { name: "Editar detalhes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover da estante" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Marcar que a vela acabou" }),
      ).not.toBeInTheDocument();
      rerender(
        <CandleBookshelf
          items={[candle]}
          onUpdate={action}
          onRemove={action}
          onFavorite={action}
        />,
      );
      expect(screen.queryByRole("button", { name: "Editar detalhes" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "♡ Favoritar esta vela" }),
      ).not.toBeInTheDocument();
      expect(action).not.toHaveBeenCalled();
    });
  },
);
