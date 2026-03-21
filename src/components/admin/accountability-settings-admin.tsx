"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { useEffect, useState } from "react";

type SettingsState = {
  monthlyDues: number;
  latenessFee: number;
  absentFee: number;
  monthlyDuesStartYear: number;
};

const defaultSettings: SettingsState = {
  monthlyDues: 0,
  latenessFee: 0,
  absentFee: 0,
  monthlyDuesStartYear: MONTHLY_DUES_YEAR_OPTIONS[0],
};

export function AccountabilitySettingsAdmin() {
  const canEdit = useCan("settings.edit");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const response = await fetch("/api/admin/accountability-settings");
      const payload = (await response.json()) as { settings?: SettingsState; message?: string };

      if (cancelled) return;

      if (response.ok && payload.settings) {
        setSettings(payload.settings);
      } else {
        setMessage(payload.message ?? "Unable to load accountability settings.");
      }
      setIsLoading(false);
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings() {
    setIsSaving(true);
    const response = await fetch("/api/admin/accountability-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Accountability Settings"
        description="Set the global monthly dues amount, start year, and the attendance-based fees used in every member accountability calculation."
        badge="Global Settings"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        {isLoading ? <p className="text-sm text-slate-600">Loading settings...</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {([
            ["monthlyDues", "Monthly Dues"],
            ["latenessFee", "Lateness Fee"],
            ["absentFee", "Absent Fee"],
          ] as const).map(([field, label]) => (
            <label key={field} className="space-y-2">
              <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</span>
              <input
                type="number"
                min="0"
                value={settings[field]}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    [field]: Number(event.target.value || 0),
                  }))
                }
                className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none focus:border-[#2CA6A4]"
              />
            </label>
          ))}
          <label className="space-y-2">
            <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Monthly Dues Start Year
            </span>
            <select
              value={settings.monthlyDuesStartYear}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  monthlyDuesStartYear: Number(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none focus:border-[#2CA6A4]"
            >
              {MONTHLY_DUES_YEAR_OPTIONS.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1E8C8A]">{message}</p>
        ) : null}

        <button
          type="button"
          disabled={!canEdit || isSaving}
          onClick={() => void saveSettings()}
          className="mt-4 rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </section>
    </div>
  );
}
