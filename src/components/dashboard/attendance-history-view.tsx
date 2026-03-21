"use client";

import { AttendanceCalendar } from "@/components/dashboard/attendance-calendar";
import { AttendanceHistoryItem } from "@/types/dashboard";
import { useEffect, useMemo, useState } from "react";

const statusClasses = {
  PRESENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LATE: "border-amber-200 bg-amber-50 text-amber-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  EXCUSED: "border-blue-200 bg-blue-50 text-blue-700",
} as const;

function getDisplayStatus(status: AttendanceHistoryItem["status"]) {
  return status === "LATE" ? "PRESENT" : status;
}

function formatAttendanceDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

export function AttendanceHistoryView() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [items, setItems] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setIsLoading(true);
      setError(null);

      let response: Response;
      try {
        response = await fetch(`/api/attendance/user?month=${month}&year=${year}`, { cache: "no-store" });
      } catch {
        if (!cancelled) {
          setError("Unable to reach attendance history right now.");
          setIsLoading(false);
        }
        return;
      }

      const contentType = response.headers.get("content-type") ?? "";
      let payload: { attendance?: AttendanceHistoryItem[]; message?: string } = {};

      if (contentType.includes("application/json")) {
        payload = (await response.json()) as { attendance?: AttendanceHistoryItem[]; message?: string };
      } else {
        const responseText = await response.text();
        payload = {
          message: responseText.includes("<!DOCTYPE")
            ? "Attendance history is temporarily unavailable. Please try again."
            : "Unable to load attendance history.",
        };
      }

      if (cancelled) return;

      if (response.ok) {
        setItems(payload.attendance ?? []);
      } else {
        setError(payload.message ?? "Unable to load attendance history.");
      }
      setIsLoading(false);
    }

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const groupedItems = useMemo(() => {
    return items.reduce<Array<{ date: string; record: AttendanceHistoryItem }>>((accumulator, item) => {
      accumulator.push({ date: item.date, record: item });
      return accumulator;
    }, []);
  }, [items]);

  return (
    <div className="space-y-4">
      <section className="dashboard-feature-card rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="dashboard-feature-select rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(2026, index, 1).toLocaleDateString("en-GB", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="dashboard-feature-select rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            {Array.from({ length: 5 }, (_, index) => {
              const optionYear = today.getFullYear() - 2 + index;
              return (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              );
            })}
          </select>
        </div>
      </section>

      <AttendanceCalendar records={items} month={month} year={year} />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Attendance History</h2>
          <p className="dashboard-feature-copy mt-1 text-sm text-slate-600">Attendance records grouped by date for the selected month.</p>
        </div>

        {isLoading ? <p className="text-sm text-slate-600">Loading attendance history...</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {!isLoading && !error && groupedItems.length === 0 ? (
          <p className="dashboard-feature-empty rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No attendance records found for this period.
          </p>
        ) : null}

        <div className="space-y-3">
          {groupedItems.map(({ date, record }) => (
            <article
              key={record.id}
              className="dashboard-feature-card rounded-[24px] border border-[#9FD6D5]/70 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(31,41,55,0.05)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="dashboard-feature-title text-sm font-semibold text-[#1F2937]">{formatAttendanceDate(date)}</p>
                  <p className="dashboard-feature-copy mt-1 text-xs text-slate-500">Attendance record</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClasses[getDisplayStatus(record.status)]}`}
                >
                  {getDisplayStatus(record.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
