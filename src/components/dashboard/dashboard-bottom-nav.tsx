"use client";

import { CircleEllipsis, Coins, HandCoins, Home, Users } from "lucide-react";

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
  if (tab === "home") return <Home className="h-5 w-5" strokeWidth={2} />;
  if (tab === "monthly-dues") return <Coins className="h-5 w-5" strokeWidth={2} />;
  if (tab === "members") return <Users className="h-5 w-5" strokeWidth={2} />;
  if (tab === "choir-finance") return <HandCoins className="h-5 w-5" strokeWidth={2} />;
  return <CircleEllipsis className="h-5 w-5" strokeWidth={2} />;
}

export function DashboardBottomNav({ activeTab, onSelect }: DashboardBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 md:hidden">
      <div className="dashboard-bottom-nav w-full rounded-[30px] border border-white/10 bg-[#0F6B68]/95 p-2 shadow-[0_-8px_30px_rgba(15,107,104,0.10)] backdrop-blur">
        <div className="grid grid-cols-5 gap-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelect(tab.key)}
                className={`flex min-h-[60px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "dashboard-bottom-nav-active bg-white/16 text-white shadow-[0_6px_20px_rgba(0,0,0,0.14)]"
                    : "dashboard-bottom-nav-idle text-white"
                }`}
              >
                <TabIcon tab={tab.key} />
                <span className="mt-1.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
