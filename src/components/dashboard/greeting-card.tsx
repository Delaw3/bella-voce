"use client";

import { ActionModal } from "@/components/ui/action-modal";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { formatNaira } from "@/lib/naira";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type GreetingCardProps = {
  totalOwed: number;
  onOpenOwed: () => void;
  onOpenPay: () => void;
  canAccessAdmin?: boolean;
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

export function GreetingCard({ totalOwed, onOpenOwed, onOpenPay, canAccessAdmin = false }: GreetingCardProps) {
  const router = useRouter();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [isOpeningAdmin, setIsOpeningAdmin] = useState(false);
  const isOwing = Number(totalOwed) > 0;

  useEffect(() => {
    if (!isPasswordModalOpen && !isOpeningAdmin) return;

    return lockBodyScroll();
  }, [isPasswordModalOpen, isOpeningAdmin]);

  async function confirmAdminAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setIsConfirming(true);

    try {
      const response = await fetch("/api/auth/confirm-admin-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setPasswordError(payload.message ?? "Unable to confirm admin access.");
        return;
      }

      setIsPasswordModalOpen(false);
      setPassword("");
      setSuccessModalOpen(true);
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <section className="dashboard-surface-card rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_12px_30px_rgba(31,41,55,0.08)]">
        <div className="dashboard-owed-card rounded-[28px] border border-[#9FD6D5] bg-[linear-gradient(135deg,#ffffff_0%,#eef8f7_100%)] p-5 transition hover:border-[#2CA6A4]">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onOpenOwed} className="min-w-0 flex-1 text-left">
              <p className="dashboard-owed-eyebrow text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">Total Owed</p>
              <p
                className={`dashboard-owed-amount mt-3 font-display text-4xl ${isOwing ? "dashboard-owed-amount-owed text-red-600" : "text-[#1F2937]"}`}
              >
                {formatNaira(totalOwed)}
              </p>
              <p className="dashboard-owed-copy mt-2 text-sm text-slate-500">Tap to view your full accountability breakdown.</p>
            </button>
            <button
              type="button"
              onClick={onOpenPay}
              className="dashboard-pay-button inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#2CA6A4] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1E8C8A]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                <path d="M4 9h16" />
                <path d="M15.5 14h2.5" />
              </svg>
              Pay
            </button>
          </div>
        </div>

        {canAccessAdmin ? (
          <button
            type="button"
            onClick={() => {
              setPassword("");
              setPasswordError(null);
              setIsPasswordModalOpen(true);
            }}
            className="dashboard-admin-button mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#1E8C8A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#176f6d]"
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l7 4v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V7l7-4z" />
              <path d="M9.5 12.5 11 14l3.5-4" />
            </svg>
            Go to Admin
          </button>
        ) : null}
      </section>

      {isPasswordModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-[#1F2937]">Confirm Admin Access</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your password to continue to the admin control panel.
            </p>
            <form onSubmit={confirmAdminAccess} className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="dashboard-password-input w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 pr-11 text-sm text-[#1F2937] outline-none focus:border-[#2CA6A4]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-[#1E8C8A]"
                >
                  <PasswordEyeIcon visible={showPassword} />
                </button>
              </div>
              {passwordError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {passwordError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isConfirming}
                  className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfirming}
                  className="rounded-2xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-60"
                >
                  {isConfirming ? "Confirming..." : "Confirm Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={successModalOpen && !isOpeningAdmin}
        title="Access Confirmed"
        message="Password confirmed successfully. You can now enter the admin panel."
        tone="success"
        confirmLabel="Go to Admin"
        onClose={() => setSuccessModalOpen(false)}
        onConfirm={() => {
          setIsOpeningAdmin(true);
          router.push("/admin");
        }}
      />

      {isOpeningAdmin ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F2937]/35 p-4 backdrop-blur-[2px]">
          <div className="rounded-[28px] border border-[#9FD6D5]/70 bg-white px-8 py-7 text-center shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#9FD6D5] border-t-[#2CA6A4]" />
            <p className="mt-4 text-sm font-semibold text-[#1F2937]">Loading admin dashboard...</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
