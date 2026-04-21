"use client";

import { ActionModal } from "@/components/ui/action-modal";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { formatNaira } from "@/lib/naira";
import { ArrowRight, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FormEvent, useEffect, useState } from "react";

type AccountabilityCardProps = {
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

export function AccountabilityCard({
  totalOwed,
  onOpenOwed,
  onOpenPay,
  canAccessAdmin = false,
}: AccountabilityCardProps) {
  const router = useRouter();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [isOpeningAdmin, setIsOpeningAdmin] = useState(false);
  const isOwing = Number(totalOwed) > 0;
  const [isMounted, setIsMounted] = useState(false);
  const displayTotalOwed = formatNaira(totalOwed).replace(/\.00$/, "");

  useEffect(() => {
    if (!isPasswordModalOpen && !isOpeningAdmin) return;
    return lockBodyScroll();
  }, [isPasswordModalOpen, isOpeningAdmin]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
      <section className="rounded-[28px] border border-[#BFE5E1]/60 bg-white p-4 shadow-[0_8px_30px_rgba(15,107,104,0.08)]">
        <div className="relative overflow-hidden rounded-[28px] border border-[#BFE5E1]/70 bg-[linear-gradient(135deg,#FFFFFF_0%,#F4FBFA_38%,#E6F7F5_100%)] p-5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-[#DDF4F2]/80 blur-2xl" />
            <div className="absolute left-1/3 top-0 h-24 w-24 rounded-full bg-white/80 blur-2xl" />
            <div className="absolute right-10 top-8 h-36 w-36 rounded-full bg-[#CBEDEA]/70 blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(221,244,242,0.32)_100%)]" />
          </div>

          <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onOpenOwed} className="min-w-0 flex-1 text-left">
              <p className="dashboard-owed-eyebrow text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F6B68]">TOTAL OWED</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p
                  className={`dashboard-owed-amount text-[2rem] font-semibold leading-none ${isOwing ? "dashboard-owed-amount-owed !text-red-600" : "text-[#0F6B68]"}`}
                  style={isOwing ? { color: "#dc2626" } : undefined}
                >
                  {displayTotalOwed}
                </p>
              </div>
              <p className="dashboard-owed-copy mt-3 max-w-[15rem] text-xs leading-5 text-[#5B6575]">
                Tap to view your full accountability breakdown.
              </p>
            </button>

            <div className="flex shrink-0 flex-col items-end gap-3">
              <button
                type="button"
                onClick={onOpenPay}
                className="dashboard-pay-button inline-flex min-h-7 items-center justify-center gap-1 rounded-md bg-[#0F6B68] px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-[#0d5f5c]"
              >
                <CreditCard className="h-2.5 w-2.5" />
                Pay
              </button>

              <div className="relative flex w-24 items-center justify-center sm:w-28">
                <div className="absolute inset-x-3 inset-y-5 rounded-full bg-[#DDF4F2] blur-2xl" />
                <Image
                  src="https://pvjwquzgfkspweijebwb.supabase.co/storage/v1/object/public/bella-voce/icons/wallet.png"
                  alt="Wallet illustration"
                  width={120}
                  height={120}
                  className="relative h-auto w-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {canAccessAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setPassword("");
                  setPasswordError(null);
                  setIsPasswordModalOpen(true);
                }}
                className="dashboard-admin-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#0F6B68]/10 bg-[#0F6B68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d5f5c]"
              >
                <ShieldCheck className="h-4 w-4" />
                Go to Admin Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          </div>
        </div>
      </section>

      {isMounted && isPasswordModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-md rounded-[28px] border border-[#BFE5E1]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF9F8] text-[#0F6B68]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#1F2937]">Confirm Admin Access</h3>
                <p className="mt-2 text-sm leading-6 text-[#5B6575]">
                  Enter your password to continue to the admin control panel.
                </p>
                <form onSubmit={confirmAdminAccess} className="mt-4 space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-[#BFE5E1] bg-[#F7FAFA] px-4 py-3 pr-11 text-sm text-[#1F2937] outline-none focus:border-[#1F9D94]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6575] transition hover:text-[#0F6B68]"
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
                      className="rounded-2xl border border-[#BFE5E1] px-4 py-2.5 text-sm font-semibold text-[#0F6B68] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isConfirming}
                      className="rounded-2xl bg-[#1F9D94] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#167F78] disabled:opacity-60"
                    >
                      {isConfirming ? "Confirming..." : "Confirm Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

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

      {isMounted && isOpeningAdmin
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F2937]/35 p-4 backdrop-blur-[2px]">
              <div className="rounded-[28px] border border-[#BFE5E1]/70 bg-white px-8 py-7 text-center shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BFE5E1] border-t-[#1F9D94]" />
                <p className="mt-4 text-sm font-semibold text-[#1F2937]">Loading admin dashboard...</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export { AccountabilityCard as GreetingCard };
