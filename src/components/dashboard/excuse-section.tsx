"use client";

import { excuseStatusClasses } from "@/lib/status-styles";
import { ExcuseItem } from "@/types/dashboard";
import { formatAppDate } from "@/lib/utils";
import { FormEvent, useEffect, useState } from "react";

type ExcuseSectionProps = {
  initialItems: ExcuseItem[];
};

export function ExcuseSection({ initialItems }: ExcuseSectionProps) {
  const [items, setItems] = useState<ExcuseItem[]>(initialItems);
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [excuseDate, setExcuseDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function reloadExcuses() {
    const response = await fetch("/api/excuses");
    const payload = (await response.json()) as { excuses?: ExcuseItem[] };
    if (response.ok && payload.excuses) {
      setItems(payload.excuses);
    }
  }

  async function submitExcuse(event: FormEvent<HTMLFormElement>) {
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
      await reloadExcuses();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)] sm:p-5">
      <h3 className="font-display text-2xl text-[#1F2937]">Excuses</h3>
      <p className="mt-1 text-sm text-slate-600">Submit a new excuse and track review status.</p>

      <form onSubmit={submitExcuse} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Subject
          </label>
          <input
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Reason
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Excuse Date
          </label>
          <input
            required
            type="date"
            value={excuseDate}
            onChange={(event) => setExcuseDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          />
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : "Submit Excuse"}
        </button>
      </form>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[#1F2937]">History</h4>
        {items.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No excuse records yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">{item.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${excuseStatusClasses[item.status]}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Date: {formatAppDate(item.excuseDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
