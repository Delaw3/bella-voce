"use client";

import { formatNaira } from "@/lib/naira";
import { PaymentDraftPayload, PaymentItem, PaymentOwedGroup } from "@/types/payments";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PAYMENT_DRAFT_STORAGE_KEY = "bella-voce.payment-draft";

type PaymentOptionsResponse = {
  owedGroups?: PaymentOwedGroup[];
  totalOutstanding?: number;
  message?: string;
};

function buildItemKey(item: PaymentItem) {
  return [
    item.category,
    item.description,
    item.amount,
    item.month ?? "",
    item.year ?? "",
    item.accountabilityDate ?? "",
  ].join("|");
}

function normalizeCurrencyInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = sanitized.split(".");

  if (fractionParts.length === 0) {
    return whole;
  }

  return `${whole}.${fractionParts.join("").slice(0, 2)}`;
}

export function PaymentsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"owed" | "custom">("owed");
  const [owedGroups, setOwedGroups] = useState<PaymentOwedGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [customDescription, setCustomDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const response = await fetch("/api/payments");
      const payload = (await response.json()) as PaymentOptionsResponse;

      if (cancelled) return;

      if (response.ok) {
        setOwedGroups(payload.owedGroups ?? []);
      } else {
        setError(payload.message ?? "Unable to load payment options.");
      }

      setIsLoading(false);
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItems = useMemo(() => {
    if (mode === "custom") {
      const amount = Number(customAmount || 0);
      if (!customDescription.trim() || !Number.isFinite(amount) || amount <= 0) return [];

      return [
        {
          category: "CUSTOM" as const,
          description: customDescription.trim(),
          amount,
          quantity: 1,
        },
      ];
    }

    const allItems = owedGroups.flatMap((group) => group.items);
    const selectedSet = new Set(selectedKeys);
    return allItems.filter((item) => selectedSet.has(buildItemKey(item)));
  }, [customAmount, customDescription, mode, owedGroups, selectedKeys]);

  const grandTotal = useMemo(
    () => selectedItems.reduce((total, item) => total + Number(item.amount || 0), 0),
    [selectedItems],
  );

  function toggleItem(item: PaymentItem) {
    const key = buildItemKey(item);
    setSelectedKeys((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));
  }

  function proceedToTransfer() {
    const transactionType =
      mode === "custom"
        ? "CUSTOM"
        : selectedItems.every((item) => item.category === "MONTHLY_DUES")
          ? "MONTHLY_DUES"
          : "ACCOUNTABILITY";

    const payload: PaymentDraftPayload = {
      transactionType,
      items: selectedItems,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PAYMENT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    }
    router.push("/dashboard/pay/transfer");
  }

  return (
    <main className="dashboard-feature-page min-h-screen bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-3 py-4 sm:px-5">
      <section className="mx-auto w-full max-w-3xl space-y-4">
        <div className="dashboard-feature-card rounded-[30px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_20px_45px_rgba(31,41,55,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">Bella Voce Payments</p>
              <h1 className="dashboard-feature-title mt-1 font-display text-4xl text-[#1F2937]">Pay</h1>
              <p className="dashboard-feature-copy mt-2 text-sm text-slate-600">
                Choose what to pay, view Bella Voce bank accounts, transfer externally, then submit for confirmation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/pay/history")}
                className="dashboard-feature-action rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A]"
              >
                Transaction History
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="dashboard-feature-close rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <section className="dashboard-feature-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <div className="dashboard-feature-subtle grid grid-cols-2 gap-2 rounded-[24px] bg-[#F8FAFA] p-2">
            <button
              type="button"
              onClick={() => setMode("owed")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "owed" ? "bg-[#2CA6A4] text-white" : "text-slate-600"
              }`}
            >
              Pay What I Owe
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "custom" ? "bg-[#2CA6A4] text-white" : "text-slate-600"
              }`}
            >
              Custom Payment
            </button>
          </div>

          {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading payment options...</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          {mode === "owed" ? (
            <div className="mt-4 space-y-4">
              {owedGroups.length === 0 && !isLoading ? (
                <div className="dashboard-feature-empty rounded-[24px] border border-dashed border-[#9FD6D5] bg-[#F8FAFA] px-4 py-6 text-sm text-slate-600">
                  You currently have no outstanding dues or accountability payments. You can still make a custom payment.
                </div>
              ) : null}

              {owedGroups.map((group) => (
                <section key={group.category} className="dashboard-feature-subtle rounded-[24px] border border-[#DCEEEE] bg-[#F8FAFA] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="dashboard-feature-title text-base font-semibold text-[#1F2937]">{group.label}</h2>
                      <p className="dashboard-feature-copy mt-1 text-sm text-slate-500">
                        {group.itemCount} Due{group.itemCount === 1 ? "" : "s"} • {formatNaira(group.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => {
                      const active = selectedKeys.includes(buildItemKey(item));

                      return (
                        <button
                          key={buildItemKey(item)}
                          type="button"
                          onClick={() => toggleItem(item)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            active ? "border-[#2CA6A4] bg-[#EAF9F8]" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1F2937]">{item.description}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.year ? `Year ${item.year}` : "Bella Voce payment"}
                                {item.month ? ` • Month ${item.month}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#1F2937]">{formatNaira(item.amount)}</p>
                              <p className="mt-1 text-[11px] font-semibold text-[#1E8C8A]">{active ? "Selected" : "Tap to select"}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-[#DCEEEE] bg-[#F8FAFA] p-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Description</span>
                <input
                  value={customDescription}
                  onChange={(event) => setCustomDescription(event.target.value)}
                  placeholder="Example: Thanksgiving support"
                  className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(normalizeCurrencyInput(event.target.value))}
                  placeholder="0"
                  className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-[linear-gradient(135deg,#2CA6A4_0%,#1E8C8A_100%)] p-5 text-white shadow-[0_18px_40px_rgba(31,41,55,0.16)]">
          <p className="text-xs font-semibold tracking-[0.12em] text-white/75 uppercase">Selected Summary</p>
          <p className="mt-2 text-3xl font-semibold">{formatNaira(grandTotal)}</p>
          <p className="mt-2 text-sm text-white/80">
            {selectedItems.length > 0
              ? `${selectedItems.length} Due${selectedItems.length === 1 ? "" : "s"} ready for transfer.`
              : "Select owed dues or enter a custom payment to continue."}
          </p>

          <button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={proceedToTransfer}
            className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1E8C8A] transition hover:bg-[#F8FAFA] disabled:opacity-50"
          >
            Pay
          </button>
        </section>
      </section>
    </main>
  );
}
