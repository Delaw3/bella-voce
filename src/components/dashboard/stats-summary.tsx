"use client";

import { BadgeCheck, CalendarCheck2, Star } from "lucide-react";

type StatsSummaryProps = {
  duesClearedThisYear: number;
  attendanceRate: number;
  memberSince: string;
};

export function StatsSummary({
  duesClearedThisYear,
  attendanceRate,
  memberSince,
}: StatsSummaryProps) {
  const items = [
    {
      key: "duesClearedThisYear",
      label: "Dues Cleared",
      value: `${duesClearedThisYear}`,
      icon: BadgeCheck,
      subtext: "This Year",
    },
    {
      key: "attendanceRate",
      label: "Attendance Rate",
      value: `${attendanceRate}%`,
      icon: CalendarCheck2,
      subtext: "This Year",
    },
    {
      key: "memberSince",
      label: "Member Since",
      value: memberSince,
      icon: Star,
      subtext: "Joined",
    },
  ];

  return (
    <section className="rounded-[20px] border border-[#BFE5E1]/60 bg-white p-2 shadow-[0_6px_20px_rgba(15,107,104,0.05)]">
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.key} className="min-w-0 rounded-[15px] border border-[#EEF4F4] bg-[#FCFEFE] px-2 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#EEF9F8] text-[#0F6B68]">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <p className="mt-2 text-[1.05rem] leading-none font-semibold tracking-[-0.02em] text-[#1F2937]">{item.value}</p>
              <p className="mt-1.5 text-[10px] font-semibold leading-3.5 text-[#3A4656]">{item.label}</p>
              <p className="mt-0.5 text-[9px] leading-3 text-[#1F9D94]">{item.subtext}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
