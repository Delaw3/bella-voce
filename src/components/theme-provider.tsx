"use client";

import {
  applyThemePreference,
  getStoredThemePreference,
  resolveTheme,
  ThemePreference,
} from "@/lib/theme";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = {
  children: ReactNode;
};

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: "white" | "dark";
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<"white" | "dark">(() => resolveTheme(getStoredThemePreference()));

  useEffect(() => {
    applyThemePreference(theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      const currentPreference = getStoredThemePreference();
      if (currentPreference === "system") {
        const resolved = resolveTheme(currentPreference);
        setResolvedTheme(resolved);
        document.documentElement.dataset.theme = resolved;
        document.documentElement.style.colorScheme = resolved;
      }
    };

    media.addEventListener("change", onSystemThemeChange);
    return () => media.removeEventListener("change", onSystemThemeChange);
  }, [theme]);

  function setTheme(preference: ThemePreference) {
    setThemeState(preference);
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);
    applyThemePreference(preference);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "white" : "dark");
  }

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function setTheme(preference: ThemePreference) {
  applyThemePreference(preference);
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
