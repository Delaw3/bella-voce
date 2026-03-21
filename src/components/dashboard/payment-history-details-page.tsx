"use client";

import { excuseStatusClasses } from "@/lib/status-styles";
import { formatNaira } from "@/lib/naira";
import { formatAppDateTime } from "@/lib/utils";
import { PaymentTransactionSummary } from "@/types/payments";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PaymentHistoryDetailsPageProps = {
  transactionId: string;
};

export function PaymentHistoryDetailsPage({ transactionId }: PaymentHistoryDetailsPageProps) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<PaymentTransactionSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      const response = await fetch(`/api/payments/${transactionId}`);
      const payload = (await response.json()) as { transaction?: PaymentTransactionSummary; message?: string };

      if (cancelled) return;

      if (response.ok && payload.transaction) {
        setTransaction(payload.transaction);
      } else {
        setMessage(payload.message ?? "Unable to load payment transaction.");
      }
    }

    void loadItem();
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  return (
    <main className="dashboard-feature-page min-h-screen bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-3 py-4 sm:px-5">
      <section className="mx-auto w-full max-w-3xl space-y-4">
        <div className="dashboard-feature-card rounded-[30px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_20px_45px_rgba(31,41,55,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">Payment Details</p>
              <h1 className="dashboard-feature-title mt-1 font-display text-4xl text-[#1F2937]">Transaction</h1>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/pay/history")}
              className="dashboard-feature-close rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>

        {message ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
        {transaction ? (
          <>
            <section className="dashboard-feature-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="dashboard-feature-copy text-sm text-slate-500">{transaction.transactionType.replace("_", " ")}</p>
                  <p className="dashboard-feature-title mt-1 text-2xl font-semibold text-[#1F2937]">{formatNaira(transaction.totalAmount)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${excuseStatusClasses[transaction.status]}`}>
                  {transaction.status}
                </span>
              </div>
              <p className="dashboard-feature-copy mt-3 text-sm text-slate-600">Submitted {formatAppDateTime(transaction.submittedAt)}</p>
              {transaction.adminNote ? <p className="dashboard-feature-copy mt-3 text-sm text-slate-600">Admin note: {transaction.adminNote}</p> : null}
            </section>

            <section className="dashboard-feature-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
              <h2 className="dashboard-feature-title text-lg font-semibold text-[#1F2937]">Dues</h2>
              <div className="mt-4 space-y-2">
                {transaction.items.map((item, index) => (
                  <div key={`${item.description}-${index}`} className="dashboard-feature-subtle rounded-2xl bg-[#F8FAFA] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="dashboard-feature-title text-sm font-semibold text-[#1F2937]">{item.description}</p>
                        <p className="dashboard-feature-copy mt-1 text-xs text-slate-500">{item.category.replaceAll("_", " ")}</p>
                      </div>
                      <p className="dashboard-feature-title text-sm font-semibold text-[#1F2937]">{formatNaira(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
