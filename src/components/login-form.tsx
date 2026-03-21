"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9 4.5 10 7-0.4 1-1.2 2.4-2.4 3.7" />
      <path d="M6.2 6.2C4.4 7.4 3.3 9.1 2 12c1 2.5 4.5 7 10 7 1.6 0 3-.4 4.2-1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = (await response.json()) as { message?: string; nextPath?: string };
      if (!response.ok) {
        setError(payload.message ?? "Login failed.");
        return;
      }

      router.push(payload.nextPath ?? "/dashboard");
      router.refresh();
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
          Username or Email
        </label>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
          placeholder="Enter username or email"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-[#1E8C8A]"
          >
            <PasswordEyeIcon visible={showPassword} />
          </button>
        </div>
      </div>

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
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-sm">
        <Link href="/register" className="text-[#1E8C8A] underline decoration-[#1E8C8A]/30 underline-offset-2">
          Register
        </Link>
        <Link
          href="/forgot-password"
          className="text-[#1E8C8A] underline decoration-[#1E8C8A]/30 underline-offset-2"
        >
          Forgot Password
        </Link>
      </div>
    </form>
  );
}
