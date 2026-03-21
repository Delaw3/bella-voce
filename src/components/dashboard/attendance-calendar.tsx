"use client";

import { AttendanceHistoryItem } from "@/types/dashboard";
import { useMemo, useState } from "react";

type AttendanceCalendarProps = {
  records: AttendanceHistoryItem[];
  month: number;
  year: number;
};

function getDisplayStatus(status: AttendanceHistoryItem["status"]) {
  return status === "LATE" ? "PRESENT" : status;
}

function getAttendanceDateParts(value: string) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() + 60 * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function toDayKey(value: string) {
  const { year, month, day } = getAttendanceDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const statusTone = {
  PRESENT: "bg-emerald-500",
  LATE: "bg-amber-400",
  ABSENT: "bg-red-500",
  EXCUSED: "bg-blue-500",
} as const;

export function AttendanceCalendar({ records, month, year }: AttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const recordsByDay = useMemo(() => {
    return new Map(records.map((record) => [toDayKey(record.date), record]));
  }, [records]);

  const days = useMemo(() => {
    const firstDayIndex = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells: Array<number | null> = [];

    for (let index = 0; index < firstDayIndex; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [month, year]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedRecord =
    selectedDate !== null ? records.find((record) => toDayKey(record.date) === selectedDate) ?? null : null;

  return (
    <div className="space-y-4 rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]">
      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-12 rounded-2xl bg-transparent" />;
          }

          const cellDateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const record = recordsByDay.get(cellDateKey);
          const displayStatus = record ? getDisplayStatus(record.status) : null;
          const isToday = todayKey === cellDateKey;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate(record ? toDayKey(record.date) : cellDateKey)}
              className={`relative flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                isToday ? "border-[#2CA6A4] bg-[#EAF9F8] text-[#1E8C8A]" : "border-slate-100 bg-slate-50 text-[#1F2937]"
              }`}
            >
              {day}
              {record ? (
                <span className={`absolute right-1.5 bottom-1.5 h-2.5 w-2.5 rounded-full ${statusTone[displayStatus ?? "PRESENT"]}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedRecord ? (
        <div className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Selected Day</p>
          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatAttendanceDate(selectedRecord.date)}</p>
          <p className="mt-2 text-sm text-slate-600">Status: {getDisplayStatus(selectedRecord.status)}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Tap a colored day to see attendance details.</p>
      )}
    </div>
  );
}
