import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PortalInspirationChapters } from "@/components/PortalInspirationChapters";
import type { Tables } from "@/integrations/supabase/types";

type Fragment = Tables<"portal_fragments">;
const make = (id: string, position: number, title: string, body: string, context: string | null = null) =>
  ({ id, position, title, body, context, reference: "Referência dos livros", image_url: null, caption: null }) as Fragment;

const data = [
  make("origem", 1, "Como nasceu a coleção", "Texto pessoal sobre como nasceu a coleção."),
  make("seletora", 2, "A Vela Seletora", "História de como a vela revela as cores."),
  make("leao", 3, "Casa do Leão", "A sala comunal é inspiradora.", "Aroma: Trussardi"),
  make("texugo", 4, "Casa do Texugo", "As cozinhas são uma inspiração.", "Aroma: Baunilha"),
  make("natal", 8, "Entre Fios e Magia", "O primeiro presente de Natal.", "Aroma: Baunilha & Canela"),
  make("carta", 10, "Carta da Guardiã da Chama", "Uma carta sobre encontrar conforto e sentir-se em casa."),
];

afterEach(() => cleanup());

describe("Inspirações: experiência de descoberta", () => {
  it("mostra cartões compactos e mantém os textos completos ocultos até o clique", () => {
    render(<PortalInspirationChapters fragments={data} magicWorld />);
    expect(screen.getByRole("button", { name: /Entre Fios e Magia/ })).toBeInTheDocument();
    expect(screen.queryByText("A sala comunal é inspiradora.")).not.toBeInTheDocument();
    expect(screen.queryByText("Uma carta sobre encontrar conforto e sentir-se em casa.")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Explorar inspirações" })).not.toBeInTheDocument();
    expect(screen.queryByText("I · Como tudo começou")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quatro casas, quatro essências" })).toBeInTheDocument();
  });

  it("revela aroma e história separadamente, sem abrir outras casas", () => {
    const { container } = render(<PortalInspirationChapters fragments={data} magicWorld />);
    const card = container.querySelector(".portal-house-card--leao") as HTMLElement;
    const texugo = container.querySelector(".portal-house-card--texugo") as HTMLElement;
    expect(card).toBeTruthy();
    expect(texugo).toBeTruthy();
    const aromaButton = within(card).getByRole("button", { name: "Revelar aroma" });
    const storyButton = within(card).getByRole("button", { name: "Conhecer a inspiração" });
    expect(aromaButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(aromaButton);
    expect(aromaButton).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getByText("Trussardi")).toBeInTheDocument();
    expect(within(card).queryByText("A sala comunal é inspiradora.")).not.toBeInTheDocument();
    fireEvent.click(storyButton);
    expect(within(card).getByText("A sala comunal é inspiradora.")).toBeInTheDocument();
    expect(within(texugo).queryByText("Baunilha")).not.toBeInTheDocument();
    fireEvent.click(aromaButton);
    expect(within(card).queryByText("Trussardi")).not.toBeInTheDocument();
    fireEvent.click(storyButton);
    expect(within(card).queryByText("A sala comunal é inspiradora.")).not.toBeInTheDocument();
  });

  it("divide uma inspiração longa e deixa a continuação por escolha da pessoa", () => {
    const story = "Um mundo que acolhe. ".repeat(38);
    const { container } = render(<PortalInspirationChapters fragments={[make("longa", 3, "Casa do Leão", story, "Aroma: Trussardi")]} magicWorld />);
    const card = container.querySelector(".portal-house-card--leao") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Conhecer a inspiração" }));
    const continueButton = within(card).getByRole("button", { name: "Continuar a história" });
    expect(continueButton).toHaveAttribute("aria-expanded", "false");
    expect(within(card).queryByText(/Um mundo que acolhe\.\s+Um mundo que acolhe\.\s+Um mundo que acolhe\.\s+Um mundo que acolhe\.\s+Um mundo que acolhe\./)).toBeInTheDocument();
    fireEvent.click(continueButton);
    expect(continueButton).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getByRole("button", { name: "Mostrar menos" })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Mostrar menos" }));
    expect(within(card).queryByRole("button", { name: "Continuar a história" })).toBeInTheDocument();
  });

  it("deixa a carta apenas na tela principal do portal e preserva os cartões", () => {
    render(<PortalInspirationChapters fragments={data} magicWorld />);
    expect(screen.queryByRole("button", { name: /toque no selo vermelho/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Uma carta da Guardiã da Chama")).not.toBeInTheDocument();
  });

  it("mantém as casas sem a carta entre os capítulos", () => {
    const { container } = render(<PortalInspirationChapters fragments={data} magicWorld />);
    const sections = Array.from(container.querySelectorAll("section[id^='inspiracao-']")).map(el => el.id);
    expect(sections).toEqual([
      "inspiracao-origem", "inspiracao-seletora", "inspiracao-casas", "inspiracao-natal",
    ]);
    expect(screen.queryByText("IV · Os quatro caminhos")).not.toBeInTheDocument();
    expect(screen.queryByText("Cada casa guarda um aroma. Escolha qual segredo deseja revelar.")).not.toBeInTheDocument();
    expect(screen.queryByText("O segredo da seleção")).not.toBeInTheDocument();
    expect(container.querySelector(".portal-house-card--leao")).toBeInTheDocument();
  });

  it("reaproveita a vitrine vermelha do Natal e abre a história em diálogo", () => {
    const intro = make("natal-intro", 7, "O Natal no Mundo da Magia",
      "Um texto de abertura para as duas velas.",
      "Duas velas, duas memórias.");
    const { container } = render(<PortalInspirationChapters fragments={[...data, intro]} magicWorld />);
    const natal = container.querySelector("#inspiracao-natal") as HTMLElement;
    expect(within(natal).getAllByText("O Natal no Mundo da Magia")).toHaveLength(1);
    expect(natal.querySelector(".portal-natal-highlight")).toBeInTheDocument();
    expect(natal.querySelector(".portal-natal-discovery__grid")).toBeInTheDocument();
    expect(within(natal).getByText("Um texto de abertura para as duas velas.")).toBeInTheDocument();
    const photo = within(natal).getByRole("img", { name: "Vela Entre Fios e Magia" });
    expect(photo).toHaveAttribute("src", expect.stringMatching(/.+/));
    const action = within(natal).getByRole("button", { name: /Entre Fios e Magia/ });
    fireEvent.click(action);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("O primeiro presente de Natal.")).toBeInTheDocument();
    expect(within(dialog).getByText("Aroma: Baunilha & Canela")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar informações da vela" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserva a apresentação original dos demais portais", () => {
    render(<PortalInspirationChapters fragments={data.slice(0, 1)} magicWorld={false}/>);
    expect(screen.getByText("Texto pessoal sobre como nasceu a coleção.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /conhecer a inspiração/i })).not.toBeInTheDocument();
  });
});
