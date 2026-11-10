import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CandleEssenceEditor, type StockEssence } from "@/components/admin/CandleEssenceEditor";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const essences: StockEssence[] = [
  { id: "vanilla", name: "Baunilha", stock_ml: 120, active: true },
  { id: "apple", name: "Maçã", stock_ml: 80, active: true },
  { id: "orange", name: "Laranja", stock_ml: 50, active: true },
  { id: "inactive", name: "Maçã antiga", stock_ml: 30, active: false },
];

function props(overrides: Partial<ComponentProps<typeof CandleEssenceEditor>> = {}) {
  return {
    essences,
    ingredients: [],
    onIngredientsChange: vi.fn(),
    onCreate: vi.fn(async (): Promise<StockEssence> => {
      throw new Error("Unexpected creation");
    }),
    onRefresh: vi.fn(async () => {}),
    ...overrides,
  };
}

function searchFor(value: string) {
  const search = screen.getByRole("combobox", { name: "Pesquisar aroma no estoque" });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value } });
  return search;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Pesquisa única de essências no cadastro do produto", () => {
  it("mostra sugestões apenas durante a pesquisa, sem um segundo seletor, e ignora acentos", () => {
    const { container } = render(<CandleEssenceEditor {...props()} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(container.querySelector("select")).toBeNull();

    searchFor("maca");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Maçã" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Maçã antiga" })).not.toBeInTheDocument();
  });

  it("seleciona pela sugestão e adiciona o id e os ml corretos à receita", () => {
    const editorProps = props();
    render(<CandleEssenceEditor {...editorProps} />);
    const add = screen.getByRole("button", { name: "Adicionar aroma" });
    expect(add).toBeDisabled();

    const search = searchFor("baun");
    fireEvent.mouseDown(screen.getByRole("option", { name: "Baunilha" }));
    fireEvent.click(screen.getByRole("option", { name: "Baunilha" }));
    expect(search).toHaveValue("Baunilha");
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Selecionada: Baunilha/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade (ml)" }), {
      target: { value: "8.5" },
    });
    fireEvent.click(add);
    expect(editorProps.onIngredientsChange).toHaveBeenCalledWith([
      { essence_id: "vanilla", name: "Baunilha", quantity_ml: 8.5 },
    ]);
    expect(screen.getByRole("spinbutton", { name: "Quantidade (ml)" })).toHaveValue(null);
  });

  it("limpa a seleção anterior ao mudar a busca e não adiciona um aroma diferente do digitado", () => {
    const editorProps = props();
    render(<CandleEssenceEditor {...editorProps} />);
    searchFor("baun");
    fireEvent.click(screen.getByRole("option", { name: "Baunilha" }));
    searchFor("laranja");
    const add = screen.getByRole("button", { name: "Adicionar aroma" });
    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(editorProps.onIngredientsChange).not.toHaveBeenCalled();
  });

  it("permite navegar e selecionar pelo teclado sem enviar o formulário do produto", () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CandleEssenceEditor {...props()} />
      </form>,
    );
    const search = searchFor("lar");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const option = screen.getByRole("option", { name: "Laranja" });
    expect(search).toHaveAttribute("aria-activedescendant", option.id);
    fireEvent.keyDown(search, { key: "Enter" });
    expect(search).toHaveValue("Laranja");
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Adicionar aroma" })).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.focus(search);
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.focus(search);
    fireEvent.blur(search);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("informa a ausência de resultados e mantém visível o erro e a opção de atualizar o estoque", async () => {
    const editorProps = props({
      stockError: "Estoque não carregou",
      onRefresh: vi.fn(async () => {
        throw new Error("Falha de rede");
      }),
    });
    render(<CandleEssenceEditor {...editorProps} />);
    searchFor("inexistente");
    expect(screen.getByRole("status")).toHaveTextContent("Estoque indisponível");
    expect(screen.getByRole("alert")).toHaveTextContent("Estoque não carregou");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar estoque de essências" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Falha de rede"));
    expect(editorProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("valida a quantidade e atualiza uma essência já adicionada sem duplicá-la", () => {
    const editorProps = props({
      ingredients: [
        { essence_id: "vanilla", name: "Baunilha", quantity_ml: 3 },
        { essence_id: "orange", name: "Laranja", quantity_ml: 2 },
      ],
    });
    render(<CandleEssenceEditor {...editorProps} />);
    searchFor("baun");
    fireEvent.click(screen.getByRole("option", { name: "Baunilha" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
    expect(toast.error).toHaveBeenCalledWith("Informe a quantidade de essência em ml por vela.");
    expect(editorProps.onIngredientsChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade (ml)" }), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
    expect(editorProps.onIngredientsChange).toHaveBeenCalledWith([
      { essence_id: "orange", name: "Laranja", quantity_ml: 2 },
      { essence_id: "vanilla", name: "Baunilha", quantity_ml: 5 },
    ]);
  });

  it("seleciona o aroma recém-cadastrado quando o estoque recebido do pai é atualizado", async () => {
    const newEssence = { id: "lavender", name: "Lavanda", stock_ml: 40, active: true };
    const editorProps = props({ onCreate: vi.fn(async () => newEssence) });
    const { rerender } = render(<CandleEssenceEditor {...editorProps} />);
    fireEvent.click(screen.getByRole("tab", { name: "+ Cadastrar um aroma novo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nome do aroma" }), {
      target: { value: "Lavanda" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Saldo inicial (ml)" }), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência no estoque" }));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Lavanda"));
    expect(editorProps.onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Lavanda", stock_ml: 40 }),
    );
    rerender(<CandleEssenceEditor {...editorProps} essences={[...essences, newEssence]} />);
    expect(screen.getByRole("button", { name: "Adicionar aroma" })).toBeEnabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade (ml)" }), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar aroma" }));
    expect(editorProps.onIngredientsChange).toHaveBeenCalledWith([
      { essence_id: "lavender", name: "Lavanda", quantity_ml: 6 },
    ]);
  });

  it("mantém os dados e o cadastro aberto quando salvar a essência falha", async () => {
    const editorProps = props({
      onCreate: vi.fn(async () => {
        throw new Error("Não foi possível salvar");
      }),
    });
    render(<CandleEssenceEditor {...editorProps} />);
    fireEvent.click(screen.getByRole("tab", { name: "+ Cadastrar um aroma novo" }));
    const name = screen.getByRole("textbox", { name: "Nome do aroma" });
    fireEvent.change(name, { target: { value: "Canela" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Saldo inicial (ml)" }), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência no estoque" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar"));
    expect(name).toHaveValue("Canela");
    expect(screen.getByRole("spinbutton", { name: "Saldo inicial (ml)" })).toHaveValue(20);
    expect(screen.getByRole("button", { name: "Salvar essência no estoque" })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(editorProps.onIngredientsChange).not.toHaveBeenCalled();
  });

  it("não reutiliza a seleção anterior quando um cadastro duplicado volta à pesquisa", () => {
    const editorProps = props();
    render(<CandleEssenceEditor {...editorProps} />);
    searchFor("baun");
    fireEvent.click(screen.getByRole("option", { name: "Baunilha" }));
    fireEvent.click(screen.getByRole("tab", { name: "+ Cadastrar um aroma novo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nome do aroma" }), {
      target: { value: "Laranja" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar essência no estoque" }));
    expect(editorProps.onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveValue("Laranja");
    expect(screen.getByRole("button", { name: "Adicionar aroma" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Laranja" })).toBeInTheDocument();
  });
});
