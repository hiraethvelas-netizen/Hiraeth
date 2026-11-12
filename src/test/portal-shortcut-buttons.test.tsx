import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { PortalShortcutButtons } from "@/components/PortalShortcutButtons";

afterEach(cleanup);

describe("Atalhos fotográficos do Mundo da Magia", () => {
  it("mostra três bolinhas com imagens editáveis e nomes separados abaixo", () => {
    const { container } = render(<PortalShortcutButtons theme={{ shortcut_images: {
      playlist: "/musica.webp", inspirations: "/livros.webp", app: "/aplicativo.webp",
    } }} spotifyUrl="https://open.spotify.com/playlist/abc" spotifyVisible
      inspirationUrl="/portal/o-mundo-de-magia/inspiracoes" appUrl="/inicio" />);
    const region = screen.getByLabelText("Atalhos do Mundo da Magia");
    expect(within(region).getAllByRole("link")).toHaveLength(3);
    expect(within(region).getByRole("link", { name: "Conheça as inspirações" }))
      .toHaveAttribute("href", "/portal/o-mundo-de-magia/inspiracoes");
    expect(container.querySelectorAll(".portal-shortcut__circle img")).toHaveLength(3);
    expect(container.querySelectorAll(".portal-shortcut__label")).toHaveLength(3);
    expect(screen.getByText("Playlist")).toBeInTheDocument();
    expect(screen.getByText("Inspirações")).toBeInTheDocument();
    expect(screen.getByText("Aplicativo")).toBeInTheDocument();
    expect(container.querySelector(".portal-shortcut__label")?.parentElement).toHaveClass("portal-shortcut");
  });

  it("não cria link quebrado para playlist indisponível e usa ícone quando não há foto", () => {
    const { container } = render(<PortalShortcutButtons theme={{}} spotifyUrl={null}
      spotifyVisible={false} inspirationUrl="/portal/x/inspiracoes" appUrl="/inicio" />);
    expect(screen.getByLabelText("Playlist em preparação")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvir playlist/ })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".portal-shortcut__fallback")).toHaveLength(3);
  });
});
