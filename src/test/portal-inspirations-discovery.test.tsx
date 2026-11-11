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
    expect(screen.getByText(/um presente feito com carinho/i)).toBeInTheDocument();
    expect(screen.queryByText("A sala comunal é inspiradora.")).not.toBeInTheDocument();
    expect(screen.queryByText("Uma carta sobre encontrar conforto e sentir-se em casa.")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Explorar inspirações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quatro casas" })).toHaveAttribute("href", "#inspiracao-casas");
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

  it("mantém a carta em envelope até a pessoa tocar no selo verde", () => {
    render(<PortalInspirationChapters fragments={data} magicWorld />);
    const button = screen.getByRole("button", { name: /toque no selo verde para abrir a carta/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByText("Uma carta sobre encontrar conforto e sentir-se em casa.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fechar carta/i }));
    expect(screen.queryByText("Uma carta sobre encontrar conforto e sentir-se em casa.")).not.toBeInTheDocument();
  });

  it("coloca a carta entre a Seletora e as quatro casas sem mudar os cartões das casas", () => {
    const { container } = render(<PortalInspirationChapters fragments={data} magicWorld />);
    const sections = Array.from(container.querySelectorAll("section[id^='inspiracao-']")).map(el => el.id);
    expect(sections).toEqual([
      "inspiracao-origem", "inspiracao-seletora", "inspiracao-carta", "inspiracao-casas", "inspiracao-natal",
    ]);
    const nav = screen.getByRole("navigation", { name: "Explorar inspirações" });
    expect(within(nav).getAllByRole("link").map(link => link.textContent)).toEqual([
      "A origem", "A Seletora", "A carta", "Quatro casas", "Natal",
    ]);
    expect(container.querySelector(".portal-house-card--leao")).toBeInTheDocument();
  });

  it("mostra só o título e introdução do Natal e revela cada vela na caixa vermelha com foto", () => {
    const intro = make("natal-intro", 7, "O Natal no Mundo da Magia",
      "Um texto mais longo que deve ficar guardado.",
      "Duas velas, duas memórias.");
    const { container } = render(<PortalInspirationChapters fragments={[...data, intro]} magicWorld />);
    const natal = container.querySelector("#inspiracao-natal") as HTMLElement;
    expect(within(natal).getAllByText("O Natal no Mundo da Magia")).toHaveLength(1);
    expect(within(natal).getByText("Referência dos livros")).toBeInTheDocument();
    expect(within(natal).queryByText("Um texto mais longo que deve ficar guardado.")).not.toBeInTheDocument();
    const photo = within(natal).getByRole("img", { name: "Vela Entre Fios e Magia" });
    expect(photo).toHaveAttribute("src", expect.stringMatching(/.+/));
    const action = within(natal).getByRole("button", { name: /Entre Fios e Magia/ });
    expect(action).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(action);
    expect(action).toHaveAttribute("aria-expanded", "true");
    expect(within(natal).getByText("O primeiro presente de Natal.")).toBeInTheDocument();
    expect(within(natal).getByText("Aroma: Baunilha & Canela")).toBeInTheDocument();
    fireEvent.click(action);
    expect(within(natal).queryByText("O primeiro presente de Natal.")).not.toBeInTheDocument();
  });

  it("preserva a apresentação original dos demais portais", () => {
    render(<PortalInspirationChapters fragments={data.slice(0, 1)} magicWorld={false}/>);
    expect(screen.getByText("Texto pessoal sobre como nasceu a coleção.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /conhecer a inspiração/i })).not.toBeInTheDocument();
  });
});
