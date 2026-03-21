"use client";

import { COMPLAINT_MESSAGE_MAX_LENGTH, COMPLAINT_SUBJECT_MAX_LENGTH } from "@/lib/complaints";
import Link from "next/link";
import { FormEvent, useState } from "react";

const initialForm = {
  subject: "",
  message: "",
};

export function ComplaintForm() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to submit your complaint right now.");
        return;
      }

      setIsSubmitted(true);
      setForm(initialForm);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <section className="rounded-[28px] border border-[#9FD6D5] bg-white p-6 shadow-[0_20px_50px_rgba(31,41,55,0.08)]">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF9F8] text-[#1E8C8A]">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12.5 9.2 17 19 7.5" />
            </svg>
          </div>
          <h2 className="mt-4 font-display text-2xl text-[#1F2937]">Complaint Submitted</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your complaint has been submitted successfully.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-xl bg-[#2CA6A4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1E8C8A]"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#9FD6D5]/80 bg-white p-5 shadow-[0_20px_50px_rgba(31,41,55,0.08)] sm:p-6">
      <div className="mb-6">
        <span className="inline-flex rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
          Private Submission
        </span>
        <h2 className="mt-3 font-display text-2xl text-[#1F2937]">Send a Complaint</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Share your concern with the Bella Voce leadership team.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#1F2937]">Subject</span>
          <input
            value={form.subject}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            maxLength={COMPLAINT_SUBJECT_MAX_LENGTH}
            required
            className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition placeholder:text-slate-400 focus:border-[#2CA6A4] focus:ring-2 focus:ring-[#9FD6D5]/60"
            placeholder="Briefly describe the issue"
          />
          <p className="text-right text-xs text-slate-400">
            {form.subject.length}/{COMPLAINT_SUBJECT_MAX_LENGTH}
          </p>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#1F2937]">Message</span>
          <textarea
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            maxLength={COMPLAINT_MESSAGE_MAX_LENGTH}
            required
            rows={7}
            className="w-full resize-none rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm leading-6 text-[#1F2937] outline-none transition placeholder:text-slate-400 focus:border-[#2CA6A4] focus:ring-2 focus:ring-[#9FD6D5]/60"
            placeholder="Write your complaint clearly and respectfully."
          />
          <p className="text-right text-xs text-slate-400">
            {form.message.length}/{COMPLAINT_MESSAGE_MAX_LENGTH}
          </p>
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#2CA6A4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>
    </section>
  );
}
