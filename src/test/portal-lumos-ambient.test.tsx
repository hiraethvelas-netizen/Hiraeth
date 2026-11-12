import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalLumosAmbient } from "@/components/PortalLumosAmbient";

afterEach(cleanup);

describe("Lumos espalhado pelo portal NFC", () => {
  it("distribui pontos de luz decorativos do alto até o fim da página", () => {
    const { container } = render(<PortalLumosAmbient active={false} />);
    const layer = container.querySelector(".portal-lumos-ambient");
    const lights = Array.from(container.querySelectorAll<HTMLElement>(".portal-lumos-ambient__light"));
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveAttribute("data-active", "false");
    expect(layer).not.toHaveClass("portal-lumos-ambient--active");
    expect(lights).toHaveLength(52);
    expect(Number.parseFloat(lights[0]!.style.top)).toBeLessThan(5);
    expect(Number.parseFloat(lights[lights.length - 1]!.style.top)).toBeGreaterThan(90);
  });

  it("liga e desliga todas as luzes simultaneamente pelo mesmo estado", () => {
    const { container, rerender } = render(<PortalLumosAmbient active={false} />);
    rerender(<PortalLumosAmbient active />);
    expect(container.querySelector(".portal-lumos-ambient")).toHaveClass("portal-lumos-ambient--active");
    expect(container.querySelector(".portal-lumos-ambient")).toHaveAttribute("data-active", "true");
    rerender(<PortalLumosAmbient active={false} />);
    expect(container.querySelector(".portal-lumos-ambient")).not.toHaveClass("portal-lumos-ambient--active");
  });
});
