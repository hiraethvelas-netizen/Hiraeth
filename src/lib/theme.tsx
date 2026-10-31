import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type HiraethTheme = "light" | "dark";

type ThemeContextValue = {
  theme: HiraethTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const STORAGE_KEY = "hiraeth-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSavedTheme(): HiraethTheme {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: HiraethTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<HiraethTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialTheme = readSavedTheme();
    applyTheme(initialTheme);
    setTheme(initialTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // A preferência continua válida durante a sessão mesmo sem acesso ao armazenamento.
    }
  }, [ready, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme precisa ser usado dentro de ThemeProvider.");
  }
  return value;
}
