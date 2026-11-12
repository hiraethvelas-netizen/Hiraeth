import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CommunityStorySpotlight } from "@/components/CommunityStorySpotlight";

afterEach(cleanup);

describe("Pergunta da Guardiã no Círculo do Fogo", () => {
  it("abre e troca perguntas, ligando a ação ao feed existente", () => {
    const onAnswer = vi.fn();
    render(<CommunityStorySpotlight onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: /Abrir a pergunta da Guardiã/ }));
    expect(screen.getByText(/Que livro você gostaria de transformar em uma vela/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Outra pergunta" }));
    expect(screen.getByText(/Qual aroma te faria sentir em casa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Responder no Feed" }));
    expect(onAnswer).toHaveBeenCalledOnce();
  });
});
