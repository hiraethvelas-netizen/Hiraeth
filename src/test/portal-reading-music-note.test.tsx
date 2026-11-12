import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalReadingMusicNote } from "@/components/PortalReadingMusicNote";

afterEach(cleanup);

describe("Bilhete musical das inspirações NFC", () => {
  it("abre o recado Runaway — AURORA ao tocar na nota e permite fechá-lo", () => {
    const { container } = render(<PortalReadingMusicNote />);
    const button = screen.getByRole("button", { name: "Abrir dica musical para a leitura" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Leia escutando/)).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Leia escutando Runaway — AURORA.");
    expect(container.querySelector("audio")).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
