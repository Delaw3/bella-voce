"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useEffect } from "react";

type ActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger" | "success";
  isProcessing?: boolean;
};

export function ActionModal({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  isProcessing = false,
}: ActionModalProps) {
  useEffect(() => {
    if (!open) return;

    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  const confirmClassName =
    tone === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : tone === "success"
        ? "bg-emerald-500 hover:bg-emerald-600"
        : "bg-[#2CA6A4] hover:bg-[#1E8C8A]";

  const iconClassName =
    tone === "danger"
      ? "bg-red-50 text-red-600"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-[#EAF9F8] text-[#1E8C8A]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>
          {tone === "success" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m5 13 4 4L19 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </div>
        <h3 className="mt-4 text-xl font-semibold text-[#1F2937]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] disabled:opacity-60"
          >
            {onConfirm ? cancelLabel : "Close"}
          </button>
          {onConfirm ? (
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={isProcessing}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${confirmClassName}`}
            >
              {isProcessing ? "Please wait..." : confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
