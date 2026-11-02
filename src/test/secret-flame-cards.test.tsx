import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SecretFlameCard } from "@/components/SecretFlameCard";

afterEach(cleanup);

describe("As Quatro Chamas — imagens próprias", () => {
  it("uses the administrator's uploaded image without layering the old artwork", () => {
    render(<SecretFlameCard index={2} imageUrl="https://assets.example.test/carta-3.webp" />);
    expect(screen.getByRole("img", { name: "Imagem da Carta 3" })).toHaveAttribute(
      "src", "https://assets.example.test/carta-3.webp",
    );
    expect(screen.queryByText("Hiraeth")).not.toBeInTheDocument();
  });

  it("preserves the old illustrated card only when no custom image is provided", () => {
    const { container } = render(<SecretFlameCard index={0} imageUrl="" />);
    expect(screen.getByText("Carta 1")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
