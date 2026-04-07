"use client";

import { DashboardFeatureKey } from "@/components/dashboard/feature-grid";
import {
  BadgeCheck,
  Bell,
  CalendarCheck2,
  ChevronRight,
  CreditCard,
  FileText,
  ListFilter,
  MessageSquareText,
  Music4,
  Users,
  Wallet,
} from "lucide-react";

export type QuickAccessKey = DashboardFeatureKey | "notifications";

export type QuickAccessOption = {
  key: QuickAccessKey;
  label: string;
  description: string;
};

export const quickAccessOptions: QuickAccessOption[] = [
  { key: "monthly-dues", label: "Dues", description: "Check and pay your dues" },
  { key: "pay", label: "Pay", description: "Make a fresh payment" },
  { key: "payment-history", label: "Transaction History", description: "View your past payments" },
  { key: "notifications", label: "Notifications", description: "Catch up on new alerts" },
  { key: "members", label: "Members", description: "See choir members" },
  { key: "excos", label: "Excos", description: "View leadership team" },
  { key: "attendance-history", label: "Attendance History", description: "Track your attendance" },
  { key: "choir-finance", label: "Choir Finance", description: "Explore finance updates" },
  { key: "song-selections", label: "Song Selections", description: "Browse and manage songs" },
  { key: "excuses", label: "Excuses", description: "Submit or view your excuses" },
  { key: "complaint", label: "Complaint", description: "Share choir concerns" },
];

const iconClassName = "h-5 w-5 text-[#0F6B68]";

function QuickAccessIcon({ feature }: { feature: QuickAccessKey }) {
  if (feature === "notifications") return <Bell className={iconClassName} strokeWidth={2} />;
  if (feature === "excuses") return <FileText className={iconClassName} strokeWidth={2} />;
  if (feature === "monthly-dues") return <Wallet className={iconClassName} strokeWidth={2} />;
  if (feature === "members") return <Users className={iconClassName} strokeWidth={2} />;
  if (feature === "pay") return <CreditCard className={iconClassName} strokeWidth={2} />;
  if (feature === "payment-history") return <CalendarCheck2 className={iconClassName} strokeWidth={2} />;
  if (feature === "excos") return <BadgeCheck className={iconClassName} strokeWidth={2} />;
  if (feature === "attendance-history") return <CalendarCheck2 className={iconClassName} strokeWidth={2} />;
  if (feature === "choir-finance") return <Wallet className={iconClassName} strokeWidth={2} />;
  if (feature === "song-selections") return <Music4 className={iconClassName} strokeWidth={2} />;
  return <MessageSquareText className={iconClassName} strokeWidth={2} />;
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F6B68]">Quick Access</p>
          <p className="mt-1 text-[11px] leading-4 text-[#5B6575]">Open your favorite Bella Voce tools faster.</p>
        </div>
        <button
          type="button"
          onClick={onCustomize}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#BFE5E1]/70 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F6B68] shadow-[0_8px_20px_rgba(15,107,104,0.05)] transition hover:border-[#1F9D94] hover:bg-[#EEF9F8]"
        >
          Customize
          <ListFilter className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onOpenFeature(option.key)}
            className="rounded-[20px] border border-[#BFE5E1]/60 bg-white px-3 py-3 text-left shadow-[0_8px_24px_rgba(15,107,104,0.07)] transition hover:-translate-y-0.5 hover:border-[#1F9D94] hover:bg-[#FCFEFE]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF9F8]">
                <QuickAccessIcon feature={option.key} />
              </span>
              <div className="flex items-center gap-2">
                {option.key === "notifications" && unreadCount > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-600">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF9F8] text-[#0F6B68]">
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
            <p className="mt-3 text-[12px] font-semibold leading-4 text-[#1F2937]">{option.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-[#5B6575]">{option.description}</p>
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
        <p className="text-sm text-[#5B6575]">Choose the shortcuts you want on your mobile home screen.</p>
        <p className="mt-1 text-xs text-[#5B6575]/80">Tap any card to add or remove it from Quick Access.</p>
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
                "touch-manipulation rounded-[24px] border px-4 py-4 text-left transition active:scale-[0.99]",
                isSelected
                  ? "border-[#1F9D94] bg-[#EEF9F8] shadow-[0_8px_20px_rgba(31,157,148,0.12)]"
                  : "border-[#BFE5E1]/60 bg-white hover:border-[#1F9D94]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <QuickAccessIcon feature={option.key} />
                </span>
                <span
                  className={[
                    "inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                    isSelected ? "bg-[#1F9D94] text-white" : "bg-[#EEF9F8] text-[#0F6B68]",
                  ].join(" ")}
                >
                  {isSelected ? "Added" : "Add"}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#1F2937]">{option.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#5B6575]">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
