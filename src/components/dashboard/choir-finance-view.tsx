"use client";

import { ChoirFinanceList } from "@/components/dashboard/choir-finance-list";
import { ChoirFinanceSummaryCards } from "@/components/dashboard/choir-finance-summary";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { ChoirFinanceResponse } from "@/types/dashboard";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const defaultData: ChoirFinanceResponse = {
  summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
  entries: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

export function ChoirFinanceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ChoirFinanceResponse>(defaultData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 10;

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/choir-finance?page=${page}&limit=${limit}`);
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
  }, [page]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  function onPageChange(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/dashboard/choir-finance?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <ChoirFinanceSummaryCards summary={data.summary} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl text-[#1F2937]">Finance Entries</h2>
          <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
            {data.pagination.total} record{data.pagination.total === 1 ? "" : "s"}
          </span>
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
