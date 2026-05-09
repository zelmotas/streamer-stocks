import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "purple" | "midnight" | "emerald" | "light";

export const THEMES: { id: Theme; name: string; swatch: string }[] = [
  { id: "purple", name: "Purple Haze", swatch: "linear-gradient(135deg,#7c3aed,#22c55e)" },
  { id: "midnight", name: "Midnight Blue", swatch: "linear-gradient(135deg,#1e3a8a,#38bdf8)" },
  { id: "emerald", name: "Emerald", swatch: "linear-gradient(135deg,#065f46,#10b981)" },
  { id: "light", name: "Daylight", swatch: "linear-gradient(135deg,#e9d5ff,#f1f5f9)" },
];

const KEY = "ss_theme";

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("purple");

  useEffect(() => {
    const saved = (typeof window !== "undefined" ? localStorage.getItem(KEY) : null) as Theme | null;
    if (saved && THEMES.find((t) => t.id === saved)) setThemeState(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "light") root.classList.remove("dark");
    else root.classList.add("dark");
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
