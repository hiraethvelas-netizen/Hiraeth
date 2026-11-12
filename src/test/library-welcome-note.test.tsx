import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LibraryWelcomeNote } from "@/components/LibraryWelcomeNote";

afterEach(cleanup);

describe("Bilhete da Biblioteca", () => {
  it("mostra quantidades e abre um recado sem mexer nas velas", () => {
    render(<LibraryWelcomeNote total={6} finished={2} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Abrir um bilhete para sua estante/ }));
    expect(screen.getByText(/Nem toda chama que se apaga chega ao fim/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar bilhete" }));
    expect(screen.queryByText(/Nem toda chama que se apaga chega ao fim/)).not.toBeInTheDocument();
  });
});
