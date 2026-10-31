import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/lib/theme";

function ThemeProbe({ label }: { label: string }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button type="button" aria-label={`Alternar tema ${label}`} aria-pressed={isDark} onClick={toggleTheme}>
      {label}: {theme}
    </button>
  );
}

function ThemeConsumers() {
  return (
    <ThemeProvider>
      <ThemeProbe label="Cabeçalho" />
      <ThemeProbe label="Administração" />
    </ThemeProvider>
  );
}

describe("Hiraeth theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("shares one theme state between the header and administration controls", async () => {
    render(<ThemeConsumers />);

    await waitFor(() => {
      expect(window.localStorage.getItem("hiraeth-theme")).toBe("light");
    });
    expect(screen.getByRole("button", { name: "Alternar tema Cabeçalho" })).toHaveTextContent("Cabeçalho: light");
    expect(screen.getByRole("button", { name: "Alternar tema Administração" })).toHaveTextContent("Administração: light");

    fireEvent.click(screen.getByRole("button", { name: "Alternar tema Cabeçalho" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Alternar tema Cabeçalho" })).toHaveTextContent("Cabeçalho: dark");
      expect(screen.getByRole("button", { name: "Alternar tema Administração" })).toHaveTextContent("Administração: dark");
      expect(window.localStorage.getItem("hiraeth-theme")).toBe("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("restores a saved dark theme when the app opens", async () => {
    window.localStorage.setItem("hiraeth-theme", "dark");
    render(<ThemeConsumers />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Alternar tema Cabeçalho" })).toHaveTextContent("Cabeçalho: dark");
      expect(screen.getByRole("button", { name: "Alternar tema Administração" })).toHaveTextContent("Administração: dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
