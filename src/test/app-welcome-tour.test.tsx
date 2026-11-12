import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppWelcomeTour, openHiraethWelcomeTour } from "@/components/AppWelcomeTour";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/loja");
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("Acolhimento da primeira visita Hiraeth", () => {
  it("apresenta a marca, explica Aprox e mostra áreas do app sem exigir compra", () => {
    const { unmount } = render(<AppWelcomeTour />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Um lugar para histórias que merecem continuar." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/tecnologia Aprox permite abrir um portal digital/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Entender a tecnologia Aprox/ })).toHaveAttribute("href", "/sobre#aprox-nfc");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/No Acervo, encontre/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na Hiraeth" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    render(<AppWelcomeTour />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => openHiraethWelcomeTour());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("pode ser pulada sem bloquear o uso do app", () => {
    render(<AppWelcomeTour />);
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("hiraeth-app-welcome-v1")).toBe("seen");
  });
});
