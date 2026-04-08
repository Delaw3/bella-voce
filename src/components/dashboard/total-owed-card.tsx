"use client";

import { formatNaira } from "@/lib/naira";
import {
  AlertTriangle,
  BadgeAlert,
  CalendarDays,
  ChevronDown,
  Clock3,
  HandCoins,
  ShieldAlert,
} from "lucide-react";
import {
  DebtAdjustmentDetail,
  DebtAttendanceDetail,
  DebtBreakdown,
  DebtDetailBreakdown,
  DebtMonthlyDueDetail,
} from "@/types/dashboard";
import { formatAppDate, formatAppDateTime } from "@/lib/utils";

type TotalOwedCardProps = {
  debt: DebtBreakdown;
  details: DebtDetailBreakdown;
};

type OwedRowKey = Exclude<keyof DebtBreakdown, "totalOwed">;

const breakdownRows: Array<{
  key: OwedRowKey;
  label: string;
  icon: typeof CalendarDays;
  iconClassName: string;
}> = [
  { key: "monthlyDues", label: "Monthly Dues", icon: CalendarDays, iconClassName: "text-[#0F6B68]" },
  { key: "absentFee", label: "Absent Fee", icon: AlertTriangle, iconClassName: "text-[#D97706]" },
  { key: "latenessFee", label: "Lateness Fee", icon: Clock3, iconClassName: "text-[#C2410C]" },
  { key: "pledged", label: "Pledged", icon: HandCoins, iconClassName: "text-[#1F9D94]" },
  { key: "fine", label: "Fine", icon: BadgeAlert, iconClassName: "text-[#DC2626]" },
  { key: "levy", label: "Levy", icon: ShieldAlert, iconClassName: "text-[#7C3AED]" },
];

function sumMonthlyDueOutstanding(items: DebtMonthlyDueDetail[]) {
  return items.reduce((total, item) => total + (item.status === "NOT_PAID" ? item.amount : 0), 0);
}

function sumAttendanceFees(items: DebtAttendanceDetail[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function sumAdjustments(items: DebtAdjustmentDetail[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function MonthlyDueDetails({ items }: { items: DebtMonthlyDueDetail[] }) {
  const outstandingTotal = sumMonthlyDueOutstanding(items);
  const unpaidCount = items.filter((item) => item.status === "NOT_PAID").length;
  const years = [...new Set(items.map((item) => item.year))].sort((left, right) => left - right);
  const yearLabel =
    years.length === 0
      ? ""
      : years.length === 1
        ? `${years[0]}`
        : `${years[0]}-${years[years.length - 1]}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-[#D9EEEE] bg-[#F3FBFB] px-3 py-2">
        <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
          {items.length} month{items.length === 1 ? "" : "s"}
          {yearLabel ? ` • ${yearLabel}` : ""}
        </p>
        <p className="text-sm font-semibold text-[#1E8C8A]">
          Outstanding {formatNaira(outstandingTotal)}
        </p>
      </div>
      {items.map((item) => (
        <div key={`${item.year}-${item.monthNumber}`} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1F2937]">{item.month}</p>
              <p className="mt-1 text-xs text-slate-500">{item.year}</p>
            </div>
            <p className="text-sm font-semibold text-[#1F2937]">
              {item.status === "PAID" ? `Paid ${formatNaira(item.amount)}` : `Owed ${formatNaira(item.amount)}`}
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {item.status === "PAID"
              ? `Paid${item.paidAt ? ` on ${formatAppDate(item.paidAt)}` : ""}`
              : "Not paid"}
          </p>
        </div>
      ))}
      {!items.length ? null : (
        <p className="text-center text-xs text-slate-500">
          {unpaidCount} unpaid month{unpaidCount === 1 ? "" : "s"} remaining.
        </p>
      )}
    </div>
  );
}

function AttendanceFeeDetails({ items }: { items: DebtAttendanceDetail[] }) {
  const total = sumAttendanceFees(items);

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
          No records found.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-[#D9EEEE] bg-[#F3FBFB] px-3 py-2">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
              {items.length} record{items.length === 1 ? "" : "s"}
            </p>
            <p className="text-sm font-semibold text-[#1E8C8A]">{formatNaira(total)}</p>
          </div>
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1F2937]">{formatAppDate(item.date)}</p>
                <p className="text-sm font-semibold text-[#1F2937]">{formatNaira(item.amount)}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AdjustmentDetails({ items }: { items: DebtAdjustmentDetail[] }) {
  const total = sumAdjustments(items);

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
          No records found.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-[#D9EEEE] bg-[#F3FBFB] px-3 py-2">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
              {items.length} entry{items.length === 1 ? "" : "ies"}
            </p>
            <p className="text-sm font-semibold text-[#1E8C8A]">{formatNaira(total)}</p>
          </div>
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1F2937]">{formatNaira(item.amount)}</p>
                <p className="text-xs text-slate-500">{formatAppDateTime(item.date)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.reason || "No reason provided."}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function TotalOwedCard({ debt, details }: TotalOwedCardProps) {
  function getRowMeta(row: OwedRowKey) {
    if (row === "monthlyDues") {
      const items = details.monthlyDues;
      const unpaidCount = items.filter((item) => item.status === "NOT_PAID").length;
      const years = [...new Set(items.map((item) => item.year))].sort((left, right) => left - right);
      const yearLabel =
        years.length <= 1 ? years[0]?.toString() ?? "" : `${years[0]}-${years[years.length - 1]}`;
      return `${unpaidCount} unpaid / ${items.length} months${yearLabel ? ` • ${yearLabel}` : ""}`;
    }

    if (row === "absentFee") {
      return `${details.absentFee.length} date${details.absentFee.length === 1 ? "" : "s"}`;
    }

    if (row === "latenessFee") {
      return `${details.latenessFee.length} date${details.latenessFee.length === 1 ? "" : "s"}`;
    }

    const count = details[row].length;
    return `${count} entr${count === 1 ? "y" : "ies"}`;
  }

  return (
    <div className="space-y-3">
      {breakdownRows.map((row) => (
        <details
          key={row.key}
          className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition open:border-[#9FD6D5] open:bg-[#F8FBFB]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/60 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D9EEEE] bg-[#F3FBFB]">
                <row.icon className={`h-4.5 w-4.5 ${row.iconClassName}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{row.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{getRowMeta(row.key)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#1F2937]">{formatNaira(debt[row.key] as number)}</p>
              <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
            </div>
          </summary>
          <div className="border-t border-slate-100 bg-[#F8FAFA] p-3">
            {row.key === "monthlyDues" ? <MonthlyDueDetails items={details.monthlyDues} /> : null}
            {row.key === "absentFee" ? <AttendanceFeeDetails items={details.absentFee} /> : null}
            {row.key === "latenessFee" ? <AttendanceFeeDetails items={details.latenessFee} /> : null}
            {row.key === "pledged" ? <AdjustmentDetails items={details.pledged} /> : null}
            {row.key === "fine" ? <AdjustmentDetails items={details.fine} /> : null}
            {row.key === "levy" ? <AdjustmentDetails items={details.levy} /> : null}
          </div>
        </details>
      ))}
      <div className="flex items-center justify-between rounded-xl border border-[#9FD6D5] bg-[#EAF9F8] px-3 py-2.5">
        <p className="text-sm font-semibold text-[#1E8C8A]">Total Owed</p>
        <p className="text-sm font-semibold text-[#1E8C8A]">{formatNaira(debt.totalOwed)}</p>
      </div>
    </div>
  );
}
