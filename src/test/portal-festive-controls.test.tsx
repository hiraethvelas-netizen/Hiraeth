import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalChristmasDecor } from "@/components/PortalChristmasDecor";
import { PortalFestiveAccents, PortalHouseRibbons } from "@/components/PortalFestiveAccents";

afterEach(cleanup);

describe("Mais magia e acabamento das casas", () => {
  it("ativa e desativa a decoração sem reintroduzir o voo da Fênix", () => {
    const { container } = render(<PortalChristmasDecor scene="hero" />);
    const button = screen.getByRole("button", { name: /mais magia/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll(".portal-xmas-bauble")).toHaveLength(4);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".portal-xmas-decor--bright")).not.toBeNull();
    expect(document.querySelector(".portal-xmas-phoenix-flight")).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector(".portal-xmas-decor--bright")).toBeNull();
  });

  it("permite sincronizar luzes e bolas das diferentes seções com um só botão", () => {
    function Scenes() {
      const [brighter, setBrighter] = useState(false);
      return (
        <>
          <PortalChristmasDecor
            scene="hero"
            brighter={brighter}
            onToggle={() => setBrighter((value) => !value)}
          />
          <PortalChristmasDecor scene="actions" brighter={brighter} />
          <PortalFestiveAccents variant="natal" brighter={brighter} />
        </>
      );
    }
    const { container } = render(<Scenes />);
    const button = screen.getByRole("button", { name: /mais magia/i });
    fireEvent.click(button);
    expect(container.querySelectorAll(".portal-xmas-decor--bright")).toHaveLength(2);
    expect(container.querySelector(".portal-festive-accents--bright")).not.toBeNull();
    fireEvent.click(button);
    expect(container.querySelector(".portal-xmas-decor--bright")).toBeNull();
    expect(container.querySelector(".portal-festive-accents--bright")).toBeNull();
  });

  it("exibe as faixas das quatro casas como acabamento, sem falsos botões", () => {
    const { container } = render(<PortalHouseRibbons />);
    expect(
      screen.getByRole("img", { name: /grifinória, lufa-lufa, corvinal e sonserina/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".portal-house-ribbon")).toHaveLength(4);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
