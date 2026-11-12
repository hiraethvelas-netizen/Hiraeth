import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AboutStoryText } from "@/components/AboutStoryText";

afterEach(cleanup);

describe("Capítulos interativos da história Hiraeth", () => {
  const story = "Uma chama conta a primeira história. ".repeat(30);
  it("mostra primeiro um trecho e preserva o capítulo completo", () => {
    render(<AboutStoryText text={story}/>);
    const button = screen.getByRole("button", { name: "Continuar este capítulo" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Recolher capítulo" })).toHaveAttribute("aria-expanded", "true");
  });
  it("permite que a administradora visualize o conteúdo completo durante edição", () => {
    render(<AboutStoryText text={story} alwaysOpen />);
    expect(screen.queryByRole("button", { name: "Continuar este capítulo" })).not.toBeInTheDocument();
  });
});
