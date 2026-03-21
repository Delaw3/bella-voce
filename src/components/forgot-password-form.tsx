"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to process your request.");
        return;
      }
      setMessage(payload.message ?? "Request submitted.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
          placeholder="Enter your email"
          required
        />
      </div>

      {message ? (
        <p className="rounded-xl border border-[#9FD6D5]/70 bg-[#F2FBFB] px-4 py-3 text-sm text-[#1F2937]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60"
      >
        {isSubmitting ? "Submitting..." : "Continue"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Back to{" "}
        <Link href="/login" className="text-[#1E8C8A] underline decoration-[#1E8C8A]/30 underline-offset-2">
          Login
        </Link>
      </p>
    </form>
  );
}
