import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PortalInspirationFloatingCandles } from "@/components/PortalInspirationFloatingCandles";

describe("Velas flutuantes das inspirações", () => {
  it("cria velas decorativas fora do conteúdo e ocultas para leitores de tela", () => {
    const { container } = render(<PortalInspirationFloatingCandles />);
    const decor = container.querySelector(".portal-inspiration-floating-candles");
    expect(decor).toHaveAttribute("aria-hidden", "true");
    expect(decor?.querySelectorAll(".portal-inspiration-floating-candle")).toHaveLength(8);
    expect(decor?.querySelectorAll(".portal-inspiration-floating-flame")).toHaveLength(8);
  });
});
