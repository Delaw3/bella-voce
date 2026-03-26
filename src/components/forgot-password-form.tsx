"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const RESET_SESSION_STORAGE_KEY = "bella-voce.reset-session";
const EMAIL_STEPS = ["email", "otp", "reset", "success"] as const;
type ForgotPasswordStep = (typeof EMAIL_STEPS)[number];

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

function isValidStep(value: string | null): value is ForgotPasswordStep {
  return EMAIL_STEPS.includes((value ?? "") as ForgotPasswordStep);
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const step = useMemo<ForgotPasswordStep>(() => {
    const stepValue = searchParams.get("step");
    return isValidStep(stepValue) ? stepValue : "email";
  }, [searchParams]);

  function updateStep(nextStep: ForgotPasswordStep, nextEmail?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", nextStep);
    if (nextEmail) {
      params.set("email", nextEmail);
    } else if (email) {
      params.set("email", email);
    }

    router.replace(`/forgot-password?${params.toString()}`);
  }

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const storedSession =
      typeof window !== "undefined" ? window.sessionStorage.getItem(RESET_SESSION_STORAGE_KEY) : null;

    if (!storedSession) {
      if (step === "reset") {
        updateStep("email", searchParams.get("email") ?? email);
      }
      return;
    }

    try {
      const parsed = JSON.parse(storedSession) as { email?: string; resetToken?: string };
      if (parsed.email) {
        setEmail(parsed.email);
      }
      if (parsed.resetToken) {
        setResetToken(parsed.resetToken);
      }
    } catch {
      window.sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);
    }
  }, [email, searchParams, step]);

  useEffect(() => {
    if (step !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      router.push("/login");
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router, step]);

  useEffect(() => {
    if (step !== "otp" || resendCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [resendCountdown, step]);

  function formatResendCountdown(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  async function requestOtp(options?: { moveToOtp?: boolean }) {
    const moveToOtp = options?.moveToOtp ?? false;

    if ((!moveToOtp && resendCountdown > 0) || isSendingOtp || isResendingOtp) {
      return;
    }

    setError(null);
    setMessage(null);
    if (moveToOtp) {
      setIsSendingOtp(true);
    } else {
      setIsResendingOtp(true);
      setResendCountdown(60);
    }

    try {
      window.sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);
      setResetToken("");

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to send OTP right now.");
        return;
      }

      setMessage(payload.message ?? "OTP sent to your email.");
      setOtp("");
      if (moveToOtp) {
        setResendCountdown(60);
      }

      if (moveToOtp) {
        updateStep("otp", email.trim().toLowerCase());
      }
    } catch {
      if (!moveToOtp) {
        setResendCountdown(0);
      }
      setError("Network error. Please try again.");
    } finally {
      setIsSendingOtp(false);
      setIsResendingOtp(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestOtp({ moveToOtp: true });
  }

  async function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsConfirmingOtp(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const payload = (await response.json()) as { message?: string; resetToken?: string };
      if (!response.ok || !payload.resetToken) {
        setError(payload.message ?? "Unable to verify OTP.");
        return;
      }

      const sessionPayload = { email: email.trim().toLowerCase(), resetToken: payload.resetToken };
      window.sessionStorage.setItem(RESET_SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
      setResetToken(payload.resetToken);
      setMessage(payload.message ?? "OTP confirmed.");
      updateStep("reset", email.trim().toLowerCase());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsConfirmingOtp(false);
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError("Your reset session has expired. Please start again.");
      updateStep("email", email.trim().toLowerCase());
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken, newPassword, confirmPassword }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to reset password.");
        return;
      }

      window.sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);
      setMessage(payload.message ?? "Password reset successful.");
      setNewPassword("");
      setConfirmPassword("");
      updateStep("success", email.trim().toLowerCase());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
        {[
          { value: "email", label: "Email" },
          { value: "otp", label: "OTP" },
          { value: "reset", label: "New Password" },
        ].map((item, index) => {
          const isActive = step === item.value || (step === "success" && item.value === "reset");
          return (
            <div key={item.value} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 ${isActive ? "bg-[#EAF9F8] text-[#1E8C8A]" : "bg-slate-100 text-slate-400"}`}
              >
                {item.label}
              </span>
              {index < 2 ? <span className="text-slate-300">•</span> : null}
            </div>
          );
        })}
      </div>

      {message && step !== "otp" ? (
        <p className="rounded-xl border border-[#9FD6D5]/70 bg-[#F2FBFB] px-4 py-3 text-sm text-[#1F2937]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {step === "email" ? (
        <form onSubmit={submitEmail} className="space-y-4">
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

          <button
            type="submit"
            disabled={isSendingOtp}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60"
          >
            {isSendingOtp ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={submitOtp} className="space-y-4">
          <div className="rounded-xl border border-[#9FD6D5]/70 bg-[#F8FAFA] px-4 py-3 text-sm text-slate-600">
            OTP sent to <span className="font-semibold text-[#1F2937]">{email}</span>. If you do not see it, please
            check your spam folder.
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              OTP
            </label>
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-center text-lg tracking-[0.35em] text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
              placeholder="000000"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={isResendingOtp || isConfirmingOtp || resendCountdown > 0}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {isResendingOtp
                ? "Sending..."
                : resendCountdown > 0
                  ? `Resend in ${formatResendCountdown(resendCountdown)}`
                  : "Resend OTP"}
            </button>
            <button
              type="submit"
              disabled={isConfirmingOtp || isResendingOtp}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60"
            >
              {isConfirmingOtp ? "Confirming..." : "Confirm OTP"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "reset" ? (
        <form onSubmit={submitNewPassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
                placeholder="Enter new password"
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
            <p className="mt-1.5 text-xs text-slate-500">Use at least 8 characters.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-11 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
                placeholder="Confirm new password"
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

          <button
            type="submit"
            disabled={isResettingPassword}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60"
          >
            {isResettingPassword ? "Updating Password..." : "Reset Password"}
          </button>
        </form>
      ) : null}

      {step === "success" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#9FD6D5]/70 bg-[#F2FBFB] px-4 py-4 text-sm text-[#1F2937]">
            Your password was reset successfully. Returning you to the login page now.
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A]"
          >
            Go to Login
          </button>
        </div>
      ) : null}

      <p className="text-center text-sm text-slate-600">
        Back to{" "}
        <Link href="/login" className="text-[#1E8C8A] underline decoration-[#1E8C8A]/30 underline-offset-2">
          Login
        </Link>
      </p>
    </div>
  );
}
