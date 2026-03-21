"use client";

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

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to change password.");
        return;
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(payload.message ?? "Password changed successfully.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          Old Password
        </label>
        <div className="relative">
          <input
            type={showOldPassword ? "text" : "password"}
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
          <button
            type="button"
            onClick={() => setShowOldPassword((prev) => !prev)}
            aria-label={showOldPassword ? "Hide old password" : "Show old password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-[#1E8C8A]"
          >
            <PasswordEyeIcon visible={showOldPassword} />
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-[#1E8C8A]"
          >
            <PasswordEyeIcon visible={showNewPassword} />
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-[#1E8C8A]"
          >
            <PasswordEyeIcon visible={showConfirmPassword} />
          </button>
        </div>
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
        {isSubmitting ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
