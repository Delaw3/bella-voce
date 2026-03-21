"use client";

import { formatNaira } from "@/lib/naira";
import { ActionModal } from "@/components/ui/action-modal";
import { PaymentAccountItem, PaymentDraftPayload } from "@/types/payments";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PAYMENT_DRAFT_STORAGE_KEY = "bella-voce.payment-draft";

export function PaymentTransferPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<PaymentDraftPayload | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success">("default");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawValue = window.sessionStorage.getItem(PAYMENT_DRAFT_STORAGE_KEY);
      if (rawValue) {
        try {
          setDraft(JSON.parse(rawValue) as PaymentDraftPayload);
        } catch {
          window.sessionStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY);
        }
      }
    }

    void (async () => {
      const response = await fetch("/api/payment-accounts");
      const payload = (await response.json()) as { accounts?: PaymentAccountItem[] };
      if (response.ok) {
        setAccounts(payload.accounts ?? []);
        if (payload.accounts?.[0]) {
          setSelectedAccountId(payload.accounts[0].id);
        }
      }
    })();
  }, []);

  const grandTotal = useMemo(
    () => draft?.items.reduce((total, item) => total + Number(item.amount || 0), 0) ?? 0,
    [draft],
  );

  async function submitTransaction() {
    if (!draft || !selectedAccountId) return;

    setIsSubmitting(true);
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        selectedAccountId,
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (response.ok) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY);
      }
      setMessageTone("success");
      setMessage(payload.message ?? "Transaction pending, waiting for confirmation");
    } else {
      setMessageTone("default");
      setMessage(payload.message ?? "Unable to submit payment.");
    }
    setIsSubmitting(false);
  }

  return (
    <main className="dashboard-feature-page min-h-screen bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-3 py-4 sm:px-5">
      <section className="mx-auto w-full max-w-3xl space-y-4">
        <div className="dashboard-feature-card rounded-[30px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_20px_45px_rgba(31,41,55,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">Bank Transfer</p>
              <h1 className="dashboard-feature-title mt-1 font-display text-4xl text-[#1F2937]">Transfer</h1>
              <p className="dashboard-feature-copy mt-2 text-sm text-slate-600">
                Transfer the money first to one of the Bella Voce accounts below, then click Done to submit your confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/pay")}
              className="dashboard-feature-close rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>

        {!draft ? (
          <div className="dashboard-feature-empty rounded-[28px] border border-dashed border-[#9FD6D5] bg-white px-4 py-6 text-sm text-slate-600">
            No payment draft found. Return to the payment page and choose what you want to pay.
          </div>
        ) : (
          <>
            <section className="dashboard-feature-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
              <h2 className="dashboard-feature-title text-lg font-semibold text-[#1F2937]">Choose Bella Voce Account</h2>
              <div className="mt-4 grid gap-3">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      selectedAccountId === account.id ? "border-[#2CA6A4] bg-[#EAF9F8]" : "border-slate-200 bg-[#F8FAFA]"
                    }`}
                  >
                    <p className="dashboard-feature-title text-base font-semibold text-[#1F2937]">{account.accountName}</p>
                    <p className="dashboard-feature-copy mt-1 text-sm text-slate-600">{account.accountNumber}</p>
                    <p className="dashboard-feature-copy mt-1 text-sm text-slate-500">{account.bankName}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="dashboard-feature-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
              <h2 className="dashboard-feature-title text-lg font-semibold text-[#1F2937]">Selected Payment Summary</h2>
              <div className="mt-4 space-y-2">
                {draft.items.map((item, index) => (
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

            <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-[linear-gradient(135deg,#2CA6A4_0%,#1E8C8A_100%)] p-5 text-white shadow-[0_18px_40px_rgba(31,41,55,0.16)]">
              <p className="text-xs font-semibold tracking-[0.12em] text-white/75 uppercase">Grand Total</p>
              <p className="mt-2 text-3xl font-semibold">{formatNaira(grandTotal)}</p>
              <p className="mt-3 text-sm text-white/85">
                Make the transfer first before clicking Done. Once submitted, your transaction will stay pending until an admin confirms it.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!selectedAccountId || isSubmitting}
                  onClick={() => void submitTransaction()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Done"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/pay")}
                  className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </section>
          </>
        )}

      </section>

      <ActionModal
        open={Boolean(message)}
        title={messageTone === "success" ? "Transfer Submitted" : "Payment Update"}
        message={message ?? ""}
        tone={messageTone}
        onClose={() => {
          if (messageTone === "success") {
            router.push("/dashboard");
            return;
          }
          setMessage(null);
        }}
      />
    </main>
  );
}
