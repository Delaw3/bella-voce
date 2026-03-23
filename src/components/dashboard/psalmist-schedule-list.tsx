"use client";

import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { formatPsalmistMonthLabel } from "@/lib/psalmist";
import { formatAppDate, formatInitials } from "@/lib/utils";
import { PsalmistScheduleItem } from "@/types/dashboard";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type PsalmistPayload = {
  month?: string;
  items?: PsalmistScheduleItem[];
  message?: string;
};

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, offset: number) {
  const [yearValue, monthValue] = monthKey.split("-");
  const date = new Date(Number(yearValue), Number(monthValue) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function PsalmistScheduleList() {
  const searchParams = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(() => searchParams.get("month")?.trim() || getCurrentMonthKey());
  const [items, setItems] = useState<PsalmistScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const routeMonth = searchParams.get("month")?.trim();
    if (routeMonth && routeMonth !== selectedMonth) {
      setSelectedMonth(routeMonth);
    }
  }, [searchParams, selectedMonth]);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/psalmist?month=${selectedMonth}`);
        const payload = (await response.json()) as PsalmistPayload;

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to fetch psalmist schedule.");
        }

        if (!cancelled) {
          setItems(payload.items ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to fetch psalmist schedule.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]">
        <button
          type="button"
          onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}
          className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
        >
          Prev
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1F2937]">{formatPsalmistMonthLabel(selectedMonth)}</p>
          <p className="mt-1 text-xs text-slate-500">Monthly psalmist schedule</p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}
          className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
        >
          Next
        </button>
      </div>

      {isLoading ? <p className="text-sm text-slate-600">Loading psalmist schedule...</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {!isLoading && !error && items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No psalmist assignments available for this month yet.
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]"
          >
            <div className="flex items-center gap-3">
              <ProfileAvatar
                src={item.user?.profilePicture}
                alt={item.user?.displayName ?? "Psalmist"}
                initials={formatInitials(item.user?.firstName, item.user?.lastName)}
                size={54}
                className="h-[54px] w-[54px] border border-[#9FD6D5]/70"
                fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#1F2937]">{item.user?.displayName ?? "TBA"}</p>
                <p className="mt-1 text-sm text-slate-600">{formatAppDate(item.assignmentDate)}</p>
                {item.user?.voicePart ? <p className="mt-1 text-xs text-[#1E8C8A]">{item.user.voicePart}</p> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
