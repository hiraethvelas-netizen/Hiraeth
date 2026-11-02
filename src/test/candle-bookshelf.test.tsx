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

describe("Library categories and finished state", () => {
  it("offers official categories, groups matching names and accepts a personal category", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <CandleBookshelf
        items={[
          { ...candle, category: "harry  potter " },
          { ...candle, id: "other", title: "Outra vela", category: "Harry Potter" },
        ]}
        categoryOptions={["Harry Potter", "Friends"]}
        editable
        onUpdate={update}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Harry Potter" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Harry Potter" }));
    expect(screen.getAllByRole("button", { name: /Abrir detalhes da vela/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes da vela Vela de teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar detalhes" }));
    expect(screen.getByLabelText("Categoria / universo")).toHaveAttribute("list");
    expect(document.querySelector('option[value="Friends"]')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Categoria / universo"), {
      target: { value: "Verity" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        candle.id,
        expect.objectContaining({ category: "Verity" }),
      ),
    );
  });
  it("renders finished candles in grayscale in the shelf and in their details without changing the image URL", () => {
    render(<CandleBookshelf items={[
      { ...candle, id: "lit", title: "Acesa", finished: false },
      { ...candle, id: "finished", title: "Acabou", finished: true },
    ]} />);
    const lit = screen.getByRole("button", { name: "Abrir detalhes da vela Acesa" });
    const finished = screen.getByRole("button", { name: "Abrir detalhes da vela Acabou" });
    expect(lit.querySelector("img")).not.toHaveClass("grayscale");
    expect(finished.querySelector("img")).toHaveClass("grayscale");
    expect(finished.querySelector("img")).toHaveAttribute("src", candle.image_url);
    fireEvent.click(finished);
    const modal = screen.getByRole("dialog");
    expect(modal.querySelector("img")).toHaveClass("grayscale");
    expect(modal.querySelector("img")).toHaveAttribute("src", candle.image_url);
  });

  it("preserves the finished state on failure and updates it only after confirmation", async () => {
    const mark = vi
      .fn()
      .mockRejectedValueOnce(new Error("Falha no banco"))
      .mockResolvedValueOnce(undefined);
    render(<CandleBookshelf items={[candle]} editable onMarkFinished={mark} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes da vela Vela de teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar que a vela acabou" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha no banco");
    fireEvent.click(screen.getByRole("button", { name: "Marcar que a vela acabou" }));
    expect(
      await screen.findByRole("button", { name: "Voltar para a estante" }),
    ).toBeInTheDocument();
    expect(mark).toHaveBeenLastCalledWith(candle, true);
  });
});
