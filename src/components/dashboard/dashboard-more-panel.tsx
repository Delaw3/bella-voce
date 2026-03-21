"use client";

import { ReactNode } from "react";

type DashboardMorePanelProps = {
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenComplaint: () => void;
  onOpenSongSelections: () => void;
  onOpenAttendanceHistory: () => void;
  onOpenPay?: () => void;
  onOpenPaymentHistory?: () => void;
};

type MoreAction = {
  key: string;
  label: string;
  description: string;
  onClick: () => void;
  icon: ReactNode;
  badge?: ReactNode;
};

export function DashboardMorePanel({
  unreadCount,
  onOpenNotifications,
  onOpenComplaint,
  onOpenSongSelections,
  onOpenAttendanceHistory,
  onOpenPay,
  onOpenPaymentHistory,
}: DashboardMorePanelProps) {
  const actions: MoreAction[] = [
    ...(onOpenPay
      ? [
          {
            key: "pay",
            label: "Pay",
            description: "Make a transfer payment or review payment history.",
            onClick: onOpenPay,
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 15h3M14 15h2" />
              </svg>
            ),
          },
        ]
      : []),
    ...(onOpenPaymentHistory
      ? [
          {
            key: "payment-history",
            label: "Transaction History",
            description: "Review your submitted payment records and statuses.",
            onClick: onOpenPaymentHistory,
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 8v5l3 2" />
                <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
                <path d="M3 4v5h5" />
              </svg>
            ),
          },
        ]
      : []),
    {
      key: "notifications",
      label: "Notifications",
      description: "View recent choir updates and unread alerts.",
      onClick: onOpenNotifications,
      badge: unreadCount > 0 ? (
        <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-600">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : undefined,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
      ),
    },
    {
      key: "attendance-history",
      label: "Attendance History",
      description: "Review your attendance record and calendar.",
      onClick: onOpenAttendanceHistory,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      key: "song-selections",
      label: "Song Selections",
      description: "Open rehearsal and service song selections.",
      onClick: onOpenSongSelections,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      key: "complaint",
      label: "Complaint",
      description: "Send a complaint to the leadership team.",
      onClick: onOpenComplaint,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
          <path d="M8 8h8M8 11h5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="dashboard-section-copy text-sm text-slate-600">More Bella Voce tools and account options.</p>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className="dashboard-more-card flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-[#2CA6A4]"
          >
            <div className="flex items-center gap-3">
              <span className="dashboard-more-icon inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
                {action.icon}
              </span>
              <span>
                <span className="dashboard-more-label block text-sm font-semibold text-[#1F2937]">{action.label}</span>
                <span className="dashboard-section-copy mt-0.5 block text-xs text-slate-500">{action.description}</span>
              </span>
            </div>
            {action.badge ? action.badge : <span className="dashboard-more-arrow text-[#1E8C8A]">›</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
