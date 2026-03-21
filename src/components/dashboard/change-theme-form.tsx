"use client";

import { useTheme } from "@/hooks/use-theme";
import { ThemePreference, THEME_OPTIONS } from "@/lib/theme";

const labels: Record<ThemePreference, string> = {
  white: "White",
  dark: "Dark",
  system: "System",
};

export function ChangeThemeForm() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Choose your preferred app theme.</p>
      <div className="space-y-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-[#2CA6A4]"
          >
            <span className="text-sm font-medium text-[#1F2937]">{labels[option]}</span>
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                theme === option
                  ? "border-[#2CA6A4] bg-[#2CA6A4] text-white"
                  : "border-slate-300 bg-white text-transparent"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
