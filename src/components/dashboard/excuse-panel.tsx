"use client";

import { ThemedDateInput } from "@/components/ui/themed-date-input";
import { excuseStatusClasses } from "@/lib/status-styles";
import { ExcuseItem } from "@/types/dashboard";
import { capitalizeWords, formatAppDate } from "@/lib/utils";
import { FormEvent, useState } from "react";

type ExcusePanelProps = {
  items: ExcuseItem[];
  onReload: () => Promise<void>;
};

export function ExcusePanel({ items, onReload }: ExcusePanelProps) {
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [excuseDate, setExcuseDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/excuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, reason, excuseDate }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to submit excuse.");
        return;
      }

      setSubject("");
      setReason("");
      setExcuseDate("");
      setSuccess(payload.message ?? "Excuse submitted.");
      await onReload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-[#1F2937]">Submit New Excuse</p>
        <input
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2CA6A4]"
        />
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2CA6A4]"
        />
        <ThemedDateInput
          required
          value={excuseDate}
          onChange={setExcuseDate}
          placeholder="Pick excuse date"
        />
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : "Submit Excuse"}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#1F2937]">Excuse History</p>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No excuse records yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.subject}</p>
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${excuseStatusClasses[item.status]}`}>
                    {capitalizeWords(item.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                <p className="mt-1 text-xs text-slate-500">{formatAppDate(item.excuseDate)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
