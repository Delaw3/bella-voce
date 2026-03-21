"use client";

type DashboardBottomNavTab = "home" | "monthly-dues" | "members" | "choir-finance" | "more";

type DashboardBottomNavProps = {
  activeTab: DashboardBottomNavTab;
  onSelect: (tab: DashboardBottomNavTab) => void;
};

const tabs: Array<{ key: DashboardBottomNavTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "monthly-dues", label: "Dues" },
  { key: "members", label: "Members" },
  { key: "choir-finance", label: "Finance" },
  { key: "more", label: "More" },
];

function TabIcon({ tab }: { tab: DashboardBottomNavTab }) {
  const className = "h-5 w-5";

  if (tab === "home") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13V10.5" />
      </svg>
    );
  }

  if (tab === "monthly-dues") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    );
  }

  if (tab === "members") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 20a7 7 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M18 20a5.5 5.5 0 0 0-3.4-5.1" />
      </svg>
    );
  }

  if (tab === "choir-finance") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2v20" />
        <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}

export function DashboardBottomNav({ activeTab, onSelect }: DashboardBottomNavProps) {
  return (
    <nav className="dashboard-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#9FD6D5]/70 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 shadow-[0_-14px_30px_rgba(31,41,55,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                active ? "dashboard-bottom-nav-active bg-[#EAF9F8] text-[#1E8C8A]" : "dashboard-bottom-nav-idle text-slate-500"
              }`}
            >
              <TabIcon tab={tab.key} />
              <span className="mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
