import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalCatalogProduct } from "@/lib/portal-products";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/portal-products", () => ({
  loadPortalProductCollection: mocks.load,
  MAX_PORTAL_PRODUCTS: 5,
  PORTAL_PRODUCTS_CHANGED: "hiraeth:portal-products-updated",
}));

import { PortalProductCarousel } from "@/components/PortalProductCarousel";

function candle(id: string, name = "Vela " + id): PortalCatalogProduct {
  return {
    id,
    name,
    slug: "vela-" + id,
    images: ["https://example.com/" + id + ".jpg"],
    status: "published",
    product_type: "candle",
  };
}
const first = candle("primeira");
const second = candle("segunda");
const defaults = { configured: true, products: [first, second] };

beforeEach(() => {
  mocks.load.mockReset();
  mocks.load.mockResolvedValue(defaults);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Carrossel de produtos publicados no portal NFC", () => {
  it("carrega fotos e nomes atuais, com destino direto para cada produto da loja", async () => {
    render(
      <PortalProductCarousel portalId="portal-hp" catalogUrl="/loja?categoria=harry-potter" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Carregando as velas");
    expect(await screen.findByRole("link", { name: "Ver Vela primeira na loja" })).toHaveAttribute(
      "href",
      "/produto/vela-primeira",
    );
    expect(screen.getByRole("img", { name: first.name })).toHaveAttribute("src", first.images![0]);
    expect(screen.getByRole("link", { name: "Ver a coleção completa" })).toHaveAttribute(
      "href",
      "/loja?categoria=harry-potter",
    );
    expect(mocks.load).toHaveBeenCalledWith("portal-hp");
  });

  it("limita a cinco produtos distintos publicados sem oferecer rascunhos ou artefatos", async () => {
    mocks.load.mockResolvedValue({
      configured: true,
      products: [
        first,
        first,
        { ...candle("rascunho"), status: "draft" },
        { ...candle("camiseta"), product_type: "artifact" },
        second,
        candle("terceira"),
        candle("quarta"),
        candle("quinta"),
        candle("sexta"),
      ],
    });
    render(<PortalProductCarousel portalId="portal-hp" catalogUrl="/loja" />);
    await screen.findByRole("link", { name: "Ver Vela quinta na loja" });
    expect(screen.getAllByRole("link", { name: /^Ver Vela .* na loja$/ })).toHaveLength(5);
    expect(screen.queryByRole("link", { name: /rascunho|camiseta|sexta/ })).not.toBeInTheDocument();
  });

  it("move as fotos para os dois lados e respeita movimento reduzido", async () => {
    render(<PortalProductCarousel portalId="portal-hp" catalogUrl="/loja" />);
    const viewport = await screen.findByRole("region", { name: "Velas publicadas da coleção" });
    const scroll = vi.fn();
    Object.defineProperty(viewport, "scrollBy", { configurable: true, value: scroll });
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });
    fireEvent.click(screen.getByRole("button", { name: "Ver próximas velas da coleção" }));
    expect(scroll).toHaveBeenLastCalledWith({ left: 360, behavior: "smooth" });
    fireEvent.click(screen.getByRole("button", { name: "Ver velas anteriores da coleção" }));
    expect(scroll).toHaveBeenLastCalledWith({ left: -360, behavior: "smooth" });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    fireEvent.click(screen.getByRole("button", { name: "Ver próximas velas da coleção" }));
    expect(scroll).toHaveBeenLastCalledWith({ left: 360, behavior: "auto" });
  });

  it("mostra erro e recupera uma nova tentativa sem fingir que a coleção está vazia", async () => {
    mocks.load.mockRejectedValueOnce(new Error("offline"));
    render(
      <PortalProductCarousel
        portalId="portal-hp"
        catalogUrl="/loja"
        fallback={<p>Galeria anterior</p>}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText("Galeria anterior")).not.toBeInTheDocument();
    expect(screen.queryByText(/serão apresentadas aqui em breve/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar carregar as velas novamente" }));
    expect(
      await screen.findByRole("link", { name: "Ver Vela primeira na loja" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.load).toHaveBeenCalledTimes(2);
  });

  it("preserva a galeria anterior somente quando ainda não existe configuração de produtos", async () => {
    mocks.load.mockResolvedValue({ configured: false, products: [] });
    render(
      <PortalProductCarousel
        portalId="portal-hp"
        catalogUrl="/loja"
        fallback={<p>Galeria anterior</p>}
      />,
    );
    expect(await screen.findByText("Galeria anterior")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Conheça o acervo" })).not.toBeInTheDocument();
  });

  it("mantém vazia uma seleção explicitamente vazia, sem recuperar imagens antigas", async () => {
    mocks.load.mockResolvedValue({ configured: true, products: [] });
    render(
      <PortalProductCarousel
        portalId="portal-hp"
        catalogUrl="/loja"
        fallback={<p>Galeria anterior</p>}
      />,
    );
    expect(await screen.findByText(/serão apresentadas aqui em breve/)).toBeInTheDocument();
    expect(screen.queryByText("Galeria anterior")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /velas da coleção/ })).not.toBeInTheDocument();
  });

  it("ignora a resposta do portal anterior depois de mudar a coleção", async () => {
    let finishOld!: (value: typeof defaults) => void;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    mocks.load.mockResolvedValueOnce({ configured: true, products: [candle("nova")] });
    const { rerender } = render(
      <PortalProductCarousel portalId="portal-antigo" catalogUrl="/loja" />,
    );
    rerender(<PortalProductCarousel portalId="portal-novo" catalogUrl="/loja" />);
    expect(await screen.findByRole("link", { name: "Ver Vela nova na loja" })).toBeInTheDocument();
    await act(async () => finishOld(defaults));
    expect(
      screen.queryByRole("link", { name: "Ver Vela primeira na loja" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver Vela nova na loja" })).toBeInTheDocument();
  });

  it("atualiza a foto publicada ao retornar à página e ao mudar a seleção deste portal", async () => {
    render(<PortalProductCarousel portalId="portal-hp" catalogUrl="/loja" />);
    await screen.findByRole("img", { name: first.name });
    mocks.load.mockResolvedValue({
      configured: true,
      products: [{ ...first, images: ["https://example.com/foto-atualizada.jpg"] }],
    });
    await act(async () => fireEvent(window, new Event("focus")));
    expect(screen.getByRole("img", { name: first.name })).toHaveAttribute(
      "src",
      "https://example.com/foto-atualizada.jpg",
    );
    await act(async () =>
      fireEvent(
        window,
        new CustomEvent("hiraeth:portal-products-updated", { detail: { portalId: "outro" } }),
      ),
    );
    expect(mocks.load).toHaveBeenCalledTimes(2);
    mocks.load.mockResolvedValue({ configured: true, products: [second] });
    await act(async () =>
      fireEvent(
        window,
        new CustomEvent("hiraeth:portal-products-updated", { detail: { portalId: "portal-hp" } }),
      ),
    );
    expect(screen.getByRole("link", { name: "Ver Vela segunda na loja" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver Vela primeira na loja" }),
    ).not.toBeInTheDocument();
  });
});
