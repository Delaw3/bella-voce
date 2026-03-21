"use client";

import { ReactNode } from "react";

type DashboardSheetProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function DashboardSheet({ isOpen, title, onClose, children }: DashboardSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#1F2937]/45 p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="dashboard-sheet-shell max-h-[92vh] w-full overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-w-2xl">
        <div className="dashboard-sheet-header flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="dashboard-sheet-title font-display text-2xl text-[#1F2937]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dashboard-sheet-close rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#9FD6D5] hover:text-[#1E8C8A]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="dashboard-sheet-body max-h-[calc(92vh-4rem)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
