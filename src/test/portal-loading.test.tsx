import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markPortalReturn } from "@/lib/portal-navigation";

const mocks = vi.hoisted(() => ({
  slug: "colecao-teste",
  returning: false,
  portalQuery: vi.fn(),
  fragmentsQuery: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ slug: mocks.slug }),
    useSearch: () => (mocks.returning ? { inicio: "1" } : {}),
  }),
  notFound: () => new Error("Portal não encontrado"),
}));
vi.mock("@/components/SiteLayout", () => ({ SiteFooter: () => null }));
vi.mock("@/components/HouseCup", () => ({
  HouseCup: () => <section id="portal-taca-casas" data-testid="portal-taca-casas">Taça das Casas</section>,
}));
vi.mock("@/components/MagicPolls", () => ({
  MagicPolls: () => <section id="portal-quiz-criativo" data-testid="portal-quiz-criativo">Quiz criativo</section>,
}));

vi.mock("@/components/PortalChristmasDecor", () => ({
  PortalChristmasDecor: ({ scene, active, onToggle }: {
    scene: string; active?: boolean; onToggle?: () => void;
  }) => scene === "hero" ? <button type="button" onClick={onToggle} aria-pressed={active}>Lumos</button> : null,
}));
vi.mock("@/components/PortalFeaturedProducts", () => ({
  PortalFeaturedProducts: () => <section data-testid="portal-acervo-final">Conheça o Acervo</section>,
}));
vi.mock("@/components/PortalIntro", () => ({
  PortalIntro: ({ onEnter }: { onEnter: () => void }) => (
    <button type="button" onClick={onEnter}>
      Entrar na coleção
    </button>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: mocks.portalQuery,
        order: mocks.fragmentsQuery,
      };
      expect(["portals", "portal_fragments"]).toContain(table);
      return query;
    },
  },
}));

import { Route } from "@/routes/portal.$slug";
const PortalPage = Route.options.component!;
const portal = {
  id: "portal-teste",
  slug: "colecao-teste",
  name: "Coleção de histórias",
  intro_enabled: false,
  theme: {},
};
const fragment = {
  id: "inspiracao-teste",
  title: "Uma história preservada",
  body: "Os detalhes deste aroma.",
  position: 8,
};

beforeEach(() => {
  window.sessionStorage.clear();
  mocks.slug = "colecao-teste";
  mocks.returning = false;
  mocks.portalQuery.mockResolvedValue({ data: portal, error: null });
  mocks.fragmentsQuery.mockResolvedValue({ data: [], error: null });
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.resetAllMocks();
});

describe("Portal NFC: recuperação de falhas de carregamento", () => {
  it("permite tentar novamente uma consulta de portal que falhou", async () => {
    mocks.portalQuery.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    render(<PortalPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o portal",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar carregar o portal novamente" }));
    expect(await screen.findByRole("heading", { name: portal.name })).toBeInTheDocument();
    expect(mocks.portalQuery).toHaveBeenCalledTimes(2);
  });

  it("sai do carregamento quando a requisição do portal rejeita", async () => {
    mocks.portalQuery.mockRejectedValueOnce(new Error("Falha de rede"));
    render(<PortalPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o portal",
    );
    expect(screen.queryByText("Abrindo o portal...")).not.toBeInTheDocument();
  });

  it("recupera os textos de Natal sem repetir a abertura ou consultar novamente o portal", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.fragmentsQuery.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    render(<PortalPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Entrar na coleção" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a coleção de Natal",
    );

    mocks.fragmentsQuery.mockResolvedValueOnce({ data: [fragment], error: null });
    fireEvent.click(screen.getByRole("button", { name: "Tentar carregar novamente" }));
    expect(await screen.findByText(fragment.title)).toBeInTheDocument();
    expect(mocks.portalQuery).toHaveBeenCalledTimes(1);
    expect(mocks.fragmentsQuery).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Entrar na coleção" })).not.toBeInTheDocument();
  });

  it("mantém apenas o Natal no portal principal e abre inspirações em página separada", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.fragmentsQuery.mockResolvedValueOnce({ data: [fragment], error: null });
    render(<PortalPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Entrar na coleção" }));
    expect(await screen.findByRole("heading", { name: "O Natal no Mundo da Magia" })).toBeInTheDocument();
    expect(await screen.findByText(fragment.title)).toBeInTheDocument();
    expect(screen.queryByText(fragment.body)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Uma história preservada/ }));
    expect(screen.getByText(fragment.body)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar informações da vela" }));
    expect(screen.queryByText(fragment.body)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Conheça as inspirações/ }))
      .toHaveAttribute("href", "/portal/o-mundo-de-magia/inspiracoes");
    expect(screen.queryByText("Quatro casas, quatro essências")).not.toBeInTheDocument();
    expect(screen.queryByText("As histórias ganham forma em breve.")).not.toBeInTheDocument();
  });

  it("abre a tela inicial ao voltar das inspirações, sem repetir o vídeo", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = true;
    render(<PortalPage />);
    expect(await screen.findByRole("heading", { name: "Portas para este universo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar na coleção" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lumos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("volta direto à tela principal mesmo quando o navegador perde ?inicio=1", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = false;
    markPortalReturn(mocks.slug);
    render(<PortalPage />);
    expect(await screen.findByRole("heading", { name: "Portas para este universo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar na coleção" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lumos" })).toBeInTheDocument();
  });

  it("Lumos acende o cenário e o apaga ao clicar novamente", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = true;
    const { container } = render(<PortalPage />);
    const lumos = await screen.findByRole("button", { name: "Lumos" });
    const page = container.querySelector(".portal-world");
    expect(page).not.toHaveClass("portal-world--lumos");
    fireEvent.click(lumos);
    expect(page).toHaveClass("portal-world--lumos");
    expect(lumos).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".portal-lumos-ambient")).toHaveAttribute("data-active", "true");
    expect(container.querySelectorAll(".portal-lumos-ambient__light")).toHaveLength(52);
    fireEvent.click(lumos);
    expect(page).not.toHaveClass("portal-world--lumos");
    expect(lumos).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector(".portal-lumos-ambient")).toHaveAttribute("data-active", "false");
  });

  it("exibe Spotify apenas na bolinha do Mundo da Magia, sem player grande", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = true;
    mocks.portalQuery.mockResolvedValueOnce({
      data: {
        ...portal,
        slug: "o-mundo-de-magia",
        spotify_playlist_url: "https://open.spotify.com/playlist/abc123",
        spotify_visible: true,
        spotify_title: "Músicas para atravessar o portal",
      },
      error: null,
    });
    render(<PortalPage />);
    const spotify = await screen.findByRole("link", { name: "Ouvir playlist da coleção no Spotify" });
    expect(spotify).toHaveAttribute("href", "https://open.spotify.com/playlist/abc123");
    expect(spotify).toHaveAttribute("target", "_blank");
    expect(screen.queryByTitle("Playlist da coleção no Spotify")).not.toBeInTheDocument();
    expect(screen.queryByText("Músicas para atravessar o portal")).not.toBeInTheDocument();
    expect(screen.queryByText("Trilha sonora")).not.toBeInTheDocument();
  });

  it("preserva o player embutido em portais que não usam as bolinhas do Mundo da Magia", async () => {
    mocks.slug = "colecao-teste";
    mocks.returning = true;
    mocks.portalQuery.mockResolvedValueOnce({
      data: {
        ...portal,
        spotify_playlist_url: "https://open.spotify.com/playlist/abc123",
        spotify_visible: true,
        spotify_title: "Playlist de teste",
      },
      error: null,
    });
    render(<PortalPage />);
    expect(await screen.findByTitle("Playlist da coleção no Spotify"))
      .toHaveAttribute("src", "https://open.spotify.com/embed/playlist/abc123");
  });

  it("mostra o quiz após o Natal e deixa a Taça das Casas como última seção", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = true;
    const { container } = render(<PortalPage />);
    const acervo = await screen.findByTestId("portal-acervo-final");
    const quiz = screen.getByTestId("portal-quiz-criativo");
    const taca = screen.getByTestId("portal-taca-casas");
    const main = container.querySelector("main");
    expect(main?.lastElementChild?.contains(taca)).toBe(true);
    expect(acervo.compareDocumentPosition(quiz) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quiz.compareDocumentPosition(taca) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".portal-christmas-hall #portal-acervo")).toBeNull();
  });

  it("exibe a carta após os atalhos e permite ler o texto compacto", async () => {
    mocks.slug = "o-mundo-de-magia";
    mocks.returning = true;
    mocks.fragmentsQuery.mockResolvedValueOnce({
      data: [{ id: "letter", title: "Carta da Guardiã", body: "Texto guardado.", position: 10 }],
      error: null,
    });
    const { container } = render(<PortalPage />);
    const heading = await screen.findByRole("heading", { name: "Uma carta da Guardiã da Chama" });
    const actions = container.querySelector(".portal-shortcuts")!;
    const letter = container.querySelector("#portal-carta-da-guardia")!;
    expect(actions.compareDocumentPosition(letter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText("Texto guardado.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /toque no selo vermelho/i }));
    expect(screen.getByText("Texto guardado.")).toBeInTheDocument();
    expect(screen.getByText("Texto guardado.")).toHaveClass("leading-[1.55]");
  });

  it("distingue falha de rede de ausência de inspirações", async () => {
    mocks.fragmentsQuery.mockRejectedValueOnce(new Error("Falha de rede"));
    render(<PortalPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as inspirações",
    );
    expect(
      screen.queryByText("As histórias por trás das velas serão reveladas aqui."),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Tentar carregar as inspirações novamente" }),
    );
    expect(
      await screen.findByText("As histórias por trás das velas serão reveladas aqui."),
    ).toBeInTheDocument();
  });

  it("ignora a resposta antiga das inspirações depois de trocar o portal", async () => {
    let completeOldRequest!: (value: { data: (typeof fragment)[]; error: null }) => void;
    mocks.fragmentsQuery.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOldRequest = resolve;
        }),
    );
    const { rerender } = render(<PortalPage />);
    await waitFor(() => expect(mocks.fragmentsQuery).toHaveBeenCalledTimes(1));
    mocks.slug = "outra-colecao";
    mocks.portalQuery.mockResolvedValueOnce({
      data: { ...portal, id: "outro-portal", name: "Outra coleção" },
      error: null,
    });
    rerender(<PortalPage />);
    expect(await screen.findByRole("heading", { name: "Outra coleção" })).toBeInTheDocument();
    await waitFor(() => expect(mocks.fragmentsQuery).toHaveBeenCalledTimes(2));
    completeOldRequest({ data: [fragment], error: null });
    expect(
      await screen.findByText("As histórias por trás das velas serão reveladas aqui."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: fragment.title })).not.toBeInTheDocument();
  });
});
