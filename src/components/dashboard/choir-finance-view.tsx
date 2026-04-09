"use client";

import { ChoirFinanceList } from "@/components/dashboard/choir-finance-list";
import { ChoirFinanceSummaryCards } from "@/components/dashboard/choir-finance-summary";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { ChoirFinanceResponse } from "@/types/dashboard";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const defaultData: ChoirFinanceResponse = {
  summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
  entries: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  period: {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    label: new Date().toLocaleString("en-NG", { month: "long", year: "numeric" }),
    value: getCurrentMonthValue(),
  },
};

export function ChoirFinanceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ChoirFinanceResponse>(defaultData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 10;
  const selectedMonthValue = searchParams.get("month") && searchParams.get("year")
    ? `${searchParams.get("year")}-${String(searchParams.get("month")).padStart(2, "0")}`
    : data.period.value;

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const year = searchParams.get("year") || String(new Date().getFullYear());
      const month = searchParams.get("month") || String(new Date().getMonth() + 1);
      const response = await fetch(`/api/choir-finance?page=${page}&limit=${limit}&year=${year}&month=${month}`);
      const payload = (await response.json()) as ChoirFinanceResponse & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to load choir finance.");
        return;
      }

      setData(payload);
    } catch {
      setError("Network error. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchParams]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  function onPageChange(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/dashboard/choir-finance?${params.toString()}`);
  }

  function onMonthChange(nextValue: string) {
    if (!nextValue) return;
    const [year, month] = nextValue.split("-");
    if (!year || !month) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    params.set("month", String(Number(month)));
    params.set("page", "1");
    router.push(`/dashboard/choir-finance?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <ChoirFinanceSummaryCards summary={data.summary} />

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-[#1F2937]">Finance Entries</h2>
            <p className="mt-1 text-sm text-slate-600">Showing records for {data.period.label}.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="choir-finance-month">
              Select finance month
            </label>
            <input
              id="choir-finance-month"
              type="month"
              value={selectedMonthValue}
              onChange={(event) => onMonthChange(event.target.value)}
              className="rounded-xl border border-[#9FD6D5] bg-white px-3 py-2 text-sm font-medium text-[#1E8C8A] outline-none transition focus:border-[#2CA6A4]"
            />
            <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
              {data.pagination.total} record{data.pagination.total === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-slate-600">Loading entries...</p> : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {!isLoading && !error ? <ChoirFinanceList entries={data.entries} /> : null}
        <PaginationControls
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={onPageChange}
        />
      </section>
    </div>
  );
}
