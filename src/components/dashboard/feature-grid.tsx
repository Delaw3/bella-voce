"use client";

export type DashboardFeatureKey =
  | "excuses"
  | "monthly-dues"
  | "pay"
  | "payment-history"
  | "members"
  | "excos"
  | "attendance-history"
  | "choir-finance"
  | "song-selections"
  | "psalmist"
  | "complaint";

type FeatureGridProps = {
  onOpenFeature: (feature: DashboardFeatureKey) => void;
};

function Icon({ type }: { type: DashboardFeatureKey }) {
  const base = "h-6 w-6 text-[#1E8C8A]";
  if (type === "excuses") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3h10l4 4v14H7z" />
        <path d="M13 3v4h4M10 13h8M10 17h8M10 9h2" />
      </svg>
    );
  }
  if (type === "monthly-dues") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18M8 14h3M13 14h3" />
      </svg>
    );
  }
  if (type === "members") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </svg>
    );
  }
  if (type === "pay") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 15h3M14 15h2" />
      </svg>
    );
  }
  if (type === "payment-history") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 8v5l3 2" />
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }
  if (type === "excos") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 9.8 4.1-1.4 7-5.4 7-9.8V6z" />
        <path d="m9.5 12 1.8 1.8 3.2-3.6" />
      </svg>
    );
  }
  if (type === "attendance-history") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }
  if (type === "choir-finance") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
        <path d="M20 5h2M20 9h2" />
      </svg>
    );
  }
  if (type === "song-selections") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  if (type === "psalmist") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18V5l10-2v12" />
        <circle cx="7" cy="18" r="3" />
        <path d="M19 9h2M19 13h2" />
      </svg>
    );
  }
  if (type === "complaint") {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
        <path d="M8 8h8M8 11h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

const features: Array<{ key: DashboardFeatureKey; label: string }> = [
  { key: "excuses", label: "Excuses" },
  { key: "monthly-dues", label: "Dues" },
  { key: "pay", label: "Pay" },
  { key: "payment-history", label: "Transaction History" },
  { key: "members", label: "Members" },
  { key: "excos", label: "Excos" },
  { key: "attendance-history", label: "Attendance History" },
  { key: "psalmist", label: "Psalmist" },
  { key: "complaint", label: "Complaint" },
  { key: "choir-finance", label: "Choir Finance" },
  { key: "song-selections", label: "Song Selections" },
];

export function FeatureGrid({ onOpenFeature }: FeatureGridProps) {
  return (
    <section className="hidden md:block">
      <h2 className="mb-3 text-sm font-semibold tracking-[0.08em] text-slate-600 uppercase">
        Dashboard Features
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {features.map((feature) => (
          <button
            key={feature.key}
            type="button"
            onClick={() => onOpenFeature(feature.key)}
            className="dashboard-feature-card aspect-square rounded-2xl border border-[#9FD6D5]/70 bg-white p-3 shadow-[0_10px_24px_rgba(31,41,55,0.06)] transition hover:-translate-y-0.5 hover:border-[#2CA6A4]"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Icon type={feature.key} />
              <span className="dashboard-feature-label text-sm font-semibold text-[#1F2937]">{feature.label}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
