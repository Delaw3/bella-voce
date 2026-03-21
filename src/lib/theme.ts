export const THEME_STORAGE_KEY = "bella_voce_theme";

export const THEME_OPTIONS = ["white", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_OPTIONS)[number];
export type ResolvedTheme = "white" | "dark";

export function isThemePreference(value: string): value is ThemePreference {
  return THEME_OPTIONS.includes(value as ThemePreference);
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "white";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY) ?? "white";
  return isThemePreference(raw) ? raw : "white";
}

export function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "white";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "white";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return getSystemResolvedTheme();
  }
  return preference;
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") return;
  const resolved = resolveTheme(preference);
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function getThemeBootstrapScript() {
  return `
    (function () {
      try {
        var key = "${THEME_STORAGE_KEY}";
        var stored = window.localStorage.getItem(key) || "white";
        var preference = ["white","dark","system"].indexOf(stored) >= 0 ? stored : "white";
        var resolved = preference === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "white")
          : preference;
        document.documentElement.dataset.themePreference = preference;
        document.documentElement.dataset.theme = resolved;
        document.documentElement.style.colorScheme = resolved;
      } catch (error) {}
    })();
  `;
}
