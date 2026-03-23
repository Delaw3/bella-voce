"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { formatDisplayName, formatInitials } from "@/lib/utils";
import { useEffect, useState } from "react";

type AnalyticsResponse = {
  topDebtors: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    totalOwed: number;
  }>;
  attendanceSummary: {
    present: number;
    late: number;
    absent: number;
  };
  duesSummary: {
    month: number;
    monthName: string;
    year: number;
    monthlyFee: number;
    totalUsers: number;
    totalExpected: number;
    totalPaid: number;
    totalUnpaid: number;
    paidUsers: number;
    unpaidUsers: number;
  };
};

const emptyAnalytics: AnalyticsResponse = {
  topDebtors: [],
  attendanceSummary: { present: 0, late: 0, absent: 0 },
  duesSummary: {
    month: 0,
    monthName: "",
    year: new Date().getFullYear(),
    monthlyFee: 0,
    totalUsers: 0,
    totalExpected: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    paidUsers: 0,
    unpaidUsers: 0,
  },
};

export function AnalyticsAdmin() {
  const [data, setData] = useState<AnalyticsResponse>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      const response = await fetch("/api/admin/analytics");
      const payload = (await response.json()) as AnalyticsResponse & { message?: string };

      if (cancelled) return;

      if (response.ok) {
        setData(payload);
      } else {
        setError(payload.message ?? "Unable to load analytics.");
      }
      setIsLoading(false);
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Analytics"
        description="Track the highest debtors, attendance health, and the current monthly dues picture across the choir."
        badge="Insights"
      />

      {isLoading ? <p className="text-sm text-slate-600">Loading analytics...</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Present", value: data.attendanceSummary.present, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "Late", value: data.attendanceSummary.late, tone: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "Absent", value: data.attendanceSummary.absent, tone: "text-red-700 bg-red-50 border-red-200" },
        ].map((item) => (
          <article key={item.label} className={`rounded-[24px] border p-4 ${item.tone}`}>
            <p className="text-xs font-semibold tracking-[0.1em] uppercase">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[#1F2937]">Top Debtors</h2>
            <p className="mt-1 text-sm text-slate-600">Top 10 members by current total owed.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {data.topDebtors.map((item, index) => (
            <article key={item.userId} className="flex items-center justify-between rounded-2xl bg-[#F8FAFA] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF9F8] text-xs font-semibold text-[#1E8C8A]">
                  {index + 1}
                </span>
                <ProfileAvatar
                  src={item.profilePicture}
                  alt={formatDisplayName(item.firstName, item.lastName)}
                  initials={formatInitials(item.firstName, item.lastName)}
                  size={40}
                  className="h-10 w-10 border border-[#9FD6D5]/70"
                  fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
                />
                <p className="text-sm font-semibold text-[#1F2937]">{formatDisplayName(item.firstName, item.lastName)}</p>
              </div>
              <p className="text-sm font-semibold text-[#1F2937]">₦ {item.totalOwed.toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5">
        <h2 className="font-display text-2xl text-[#1F2937]">Monthly Dues Overview</h2>
        <p className="mt-1 text-sm text-slate-600">
          {data.duesSummary.monthName} {data.duesSummary.year}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Expected", value: data.duesSummary.totalExpected },
            { label: "Total Paid", value: data.duesSummary.totalPaid },
            { label: "Total Unpaid", value: data.duesSummary.totalUnpaid },
            { label: "Monthly Fee", value: data.duesSummary.monthlyFee },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#F8FAFA] px-4 py-3">
              <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">{item.label}</p>
              <p className="mt-2 text-xl font-semibold text-[#1F2937]">₦ {item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#EAF9F8] px-4 py-3 text-sm text-[#1E8C8A]">
            Paid Users: <span className="font-semibold">{data.duesSummary.paidUsers}</span>
          </div>
          <div className="rounded-2xl bg-[#F8FAFA] px-4 py-3 text-sm text-slate-600">
            Unpaid Users: <span className="font-semibold text-[#1F2937]">{data.duesSummary.unpaidUsers}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
