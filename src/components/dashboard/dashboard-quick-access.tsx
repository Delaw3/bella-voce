"use client";

import { DashboardFeatureKey } from "@/components/dashboard/feature-grid";

export type QuickAccessKey = DashboardFeatureKey | "notifications";

export type QuickAccessOption = {
  key: QuickAccessKey;
  label: string;
};

export const quickAccessOptions: QuickAccessOption[] = [
  {
    key: "monthly-dues",
    label: "Dues",
  },
  {
    key: "pay",
    label: "Pay",
  },
  {
    key: "payment-history",
    label: "Transaction History",
  },
  {
    key: "notifications",
    label: "Notifications",
  },
  {
    key: "members",
    label: "Members",
  },
  {
    key: "excos",
    label: "Excos",
  },
  {
    key: "attendance-history",
    label: "Attendance History",
  },
  {
    key: "choir-finance",
    label: "Choir Finance",
  },
  {
    key: "song-selections",
    label: "Song Selections",
  },
  {
    key: "excuses",
    label: "Excuses",
  },
  {
    key: "complaint",
    label: "Complaint",
  },
];

const iconClassName = "h-5 w-5 text-[#1E8C8A]";

function QuickAccessIcon({ feature }: { feature: QuickAccessKey }) {
  if (feature === "notifications") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
      </svg>
    );
  }

  if (feature === "excuses") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3h10l4 4v14H7z" />
        <path d="M13 3v4h4M10 13h8M10 17h8M10 9h2" />
      </svg>
    );
  }

  if (feature === "monthly-dues") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18M8 14h3M13 14h3" />
      </svg>
    );
  }

  if (feature === "members") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </svg>
    );
  }

  if (feature === "pay") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 15h3M14 15h2" />
      </svg>
    );
  }

  if (feature === "payment-history") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 8v5l3 2" />
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }

  if (feature === "excos") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 9.8 4.1-1.4 7-5.4 7-9.8V6z" />
        <path d="m9.5 12 1.8 1.8 3.2-3.6" />
      </svg>
    );
  }

  if (feature === "attendance-history") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }

  if (feature === "choir-finance") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
        <path d="M20 5h2M20 9h2" />
      </svg>
    );
  }

  if (feature === "song-selections") {
    return (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 8h8M8 11h5" />
    </svg>
  );
}

type DashboardQuickAccessProps = {
  features: QuickAccessKey[];
  unreadCount: number;
  onOpenFeature: (feature: QuickAccessKey) => void;
  onCustomize: () => void;
};

export function DashboardQuickAccess({
  features,
  unreadCount,
  onOpenFeature,
  onCustomize,
}: DashboardQuickAccessProps) {
  const visibleOptions = features
    .map((feature) => quickAccessOptions.find((option) => option.key === feature))
    .filter((option): option is QuickAccessOption => Boolean(option));

  return (
    <section className="grid gap-3 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Quick Access</p>
          <p className="dashboard-section-copy mt-1 text-sm text-slate-500">Open your favorite Bella Voce tools faster.</p>
        </div>
        <button
          type="button"
          onClick={onCustomize}
          className="dashboard-surface-card rounded-full border border-[#9FD6D5] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E8C8A] transition hover:border-[#2CA6A4]"
        >
          Customize
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onOpenFeature(option.key)}
            className="dashboard-quick-card rounded-2xl border border-[#9FD6D5]/70 bg-white px-3 py-2.5 text-left shadow-[0_8px_20px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-[#2CA6A4]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="dashboard-quick-icon inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF9F8]">
                <QuickAccessIcon feature={option.key} />
              </span>
              {option.key === "notifications" && unreadCount > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-600">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </div>
            <p className="dashboard-quick-label mt-2.5 text-[13px] font-semibold text-[#1F2937]">{option.label}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

type QuickAccessCustomizerProps = {
  selectedFeatures: QuickAccessKey[];
  onToggleFeature: (feature: QuickAccessKey) => void;
};

export function QuickAccessCustomizer({
  selectedFeatures,
  onToggleFeature,
}: QuickAccessCustomizerProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="dashboard-section-copy text-sm text-slate-600">Choose the shortcuts you want on your mobile home screen.</p>
        <p className="dashboard-section-copy mt-1 text-xs text-slate-500">Tap any card to add or remove it from Quick Access.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickAccessOptions.map((option) => {
          const isSelected = selectedFeatures.includes(option.key);

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onToggleFeature(option.key)}
              className={[
                "touch-manipulation rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]",
                isSelected
                  ? "dashboard-customizer-card border-[#2CA6A4] bg-[#EAF9F8] shadow-[0_8px_20px_rgba(44,166,164,0.12)]"
                  : "dashboard-customizer-card border-slate-200 bg-white hover:border-[#9FD6D5]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="dashboard-customizer-icon inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <QuickAccessIcon feature={option.key} />
                </span>
                <span
                  className={[
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                    isSelected ? "bg-[#2CA6A4] text-white" : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {isSelected ? "Added" : "Add"}
                </span>
              </div>
              <p className="dashboard-quick-label mt-3 text-sm font-semibold text-[#1F2937]">{option.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
