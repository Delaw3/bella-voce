"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type VerifiedWaitlist = {
  firstName: string;
  lastName: string;
  email: string;
  uniqueId: string;
};

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

export function RegisterFlowForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [uniqueId, setUniqueId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verified, setVerified] = useState<VerifiedWaitlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">(
    "idle",
  );
  const [usernameStatusMessage, setUsernameStatusMessage] = useState("");

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  useEffect(() => {
    if (step !== 2) return;

    if (!normalizedUsername) {
      setUsernameStatus("idle");
      setUsernameStatusMessage("");
      return;
    }

    if (normalizedUsername.length < 3) {
      setUsernameStatus("error");
      setUsernameStatusMessage("Username must be at least 3 characters.");
      return;
    }

    let isCancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setUsernameStatus("checking");
        setUsernameStatusMessage("Checking username...");

        const response = await fetch("/api/auth/register/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalizedUsername }),
        });

        const payload = (await response.json()) as { message?: string; available?: boolean };
        if (isCancelled) return;

        if (!response.ok) {
          setUsernameStatus("error");
          setUsernameStatusMessage(payload.message ?? "Unable to check username.");
          return;
        }

        if (payload.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
        }
        setUsernameStatusMessage(payload.message ?? "");
      } catch {
        if (!isCancelled) {
          setUsernameStatus("error");
          setUsernameStatusMessage("Unable to check username.");
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [normalizedUsername, step]);

  async function verifyId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register/verify-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueId }),
      });
      const payload = (await response.json()) as {
        message?: string;
        waitlist?: VerifiedWaitlist;
      };

      if (!response.ok) {
        setError(payload.message ?? "Unable to verify unique ID.");
        return;
      }

      setVerified(payload.waitlist ?? null);
      setUniqueId(payload.waitlist?.uniqueId ?? uniqueId);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (usernameStatus === "checking") {
      setError("Please wait for username check to complete.");
      return;
    }

    if (usernameStatus !== "available") {
      setError("Please choose an available username.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueId, username, password, confirmPassword }),
      });
      const payload = (await response.json()) as { message?: string; nextPath?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to create account.");
        return;
      }

      router.push(payload.nextPath ?? "/onboarding");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {step === 1 ? (
        <form onSubmit={verifyId} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              Unique ID
            </label>
            <input
              value={uniqueId}
              onChange={(event) => setUniqueId(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#1F2937] uppercase outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
              placeholder="BV-XXXXX"
              autoCapitalize="characters"
              required
            />
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
            {isSubmitting ? "Verifying..." : "Verify Unique ID"}
          </button>
        </form>
      ) : (
        <form onSubmit={createAccount} className="space-y-4">
          {verified ? (
            <div className="break-words rounded-xl border border-[#9FD6D5]/70 bg-[#F2FBFB] px-4 py-3 text-center text-sm text-[#1F2937]">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-[#2CA6A4]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
                <span>ID verified for {verified.firstName} {verified.lastName}</span>
              </span>
              <p className="mt-1">({verified.email})</p>
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              Username
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
              placeholder="Choose a username"
              required
            />
            {usernameStatusMessage ? (
              <p
                className={`mt-1 text-xs ${
                  usernameStatus === "available"
                    ? "text-emerald-700"
                    : usernameStatus === "checking"
                      ? "text-slate-500"
                      : "text-red-600"
                }`}
              >
                {usernameStatusMessage}
              </p>
            ) : null}
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
                placeholder="Create a password"
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
                placeholder="Confirm password"
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

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || usernameStatus === "checking" || usernameStatus === "taken"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1E8C8A] underline decoration-[#1E8C8A]/30 underline-offset-2">
          Login
        </Link>
      </p>
    </div>
  );
}
