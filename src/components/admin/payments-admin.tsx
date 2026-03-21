"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { ActionModal } from "@/components/ui/action-modal";
import { formatNaira } from "@/lib/naira";
import { excuseStatusClasses } from "@/lib/status-styles";
import { formatAppDateTime, formatDisplayName } from "@/lib/utils";
import { PaymentTransactionSummary } from "@/types/payments";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PaymentsResponse = {
  items?: PaymentTransactionSummary[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  message?: string;
};

type MemberCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  owedGroups: Array<{
    category: "LEVY" | "FINE" | "LATENESS_FEE" | "ABSENT_FEE" | "PLEDGE";
    label: string;
    amount: number;
  }>;
  owedByCategory: Record<"LEVY" | "FINE" | "LATENESS_FEE" | "ABSENT_FEE" | "PLEDGE", number>;
};

const initialPagination = { page: 1, limit: 10, total: 0, totalPages: 1 };

export function PaymentsAdmin() {
  const router = useRouter();
  const canCreate = useCan("payments.create");
  const canApprove = useCan("payments.approve");
  const canDelete = useCan("payments.delete");
  const [items, setItems] = useState<PaymentTransactionSummary[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PaymentTransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [manualUserQuery, setManualUserQuery] = useState("");
  const [manualCandidates, setManualCandidates] = useState<MemberCandidate[]>([]);
  const [manualUser, setManualUser] = useState<MemberCandidate | null>(null);
  const [manualCategory, setManualCategory] = useState<"LEVY" | "FINE" | "LATENESS_FEE" | "ABSENT_FEE" | "PLEDGE">("LEVY");
  const [manualAmount, setManualAmount] = useState("0");
  const [manualDescription, setManualDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PaymentTransactionSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentTransactionSummary | null>(null);
  const selectedManualOutstanding = manualUser?.owedByCategory[manualCategory] ?? 0;

  async function loadItems(nextPage = pagination.page, nextStatus = status, nextQuery = query) {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(pagination.limit),
      status: nextStatus,
    });
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }
    const response = await fetch(`/api/admin/payments?${params.toString()}`);
    const payload = (await response.json()) as PaymentsResponse;

    if (response.ok) {
      setItems(payload.items ?? []);
      setPagination(payload.pagination ?? initialPagination);
    } else {
      setMessage(payload.message ?? "Unable to load payments.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadItems(1, "ALL", "");
  }, []);

  async function openDetails(id: string) {
    const response = await fetch(`/api/admin/payments/${id}`);
    const payload = (await response.json()) as { transaction?: PaymentTransactionSummary; message?: string };
    if (response.ok && payload.transaction) {
      setSelectedItem(payload.transaction);
    } else {
      setMessage(payload.message ?? "Unable to load payment details.");
    }
  }

  async function updateSelected(action: "APPROVE" | "REJECT", target = selectedItem) {
    if (!target) return;
    setIsSaving(true);
    const response = await fetch(`/api/admin/payments/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json()) as { transaction?: PaymentTransactionSummary; message?: string };
    setMessage(payload.message ?? null);
    if (response.ok && payload.transaction) {
      const transaction = payload.transaction;
      setSelectedItem((current) => (current?.id === transaction.id ? transaction : current));
      await loadItems();
    }
    setIsSaving(false);
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setIsSaving(true);
    const response = await fetch(`/api/admin/payments/${deleteTarget.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setDeleteTarget(null);
    if (response.ok) {
      setSelectedItem((current) => (current?.id === deleteTarget.id ? null : current));
      await loadItems();
    }
    setIsSaving(false);
  }

  async function searchManualUsers() {
    setIsSearchingMembers(true);
    const response = await fetch(`/api/admin/payments?purpose=manual-members&q=${encodeURIComponent(manualUserQuery.trim())}`);
    const payload = (await response.json()) as {
      members?: MemberCandidate[];
      message?: string;
    };
    if (response.ok) {
      setManualCandidates(payload.members ?? []);
    } else {
      setMessage(payload.message ?? "Unable to search members.");
    }
    setIsSearchingMembers(false);
  }

  async function recordManualPayment() {
    if (!manualUser) {
      setMessage("Select a member first.");
      return;
    }

    const amount = Number(manualAmount || 0);
    if (amount > selectedManualOutstanding) {
      setMessage(`Amount cannot be more than ${formatNaira(selectedManualOutstanding)} for ${manualCategory.replaceAll("_", " ").toLowerCase()}.`);
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: manualUser.id,
        category: manualCategory,
        amount,
        description: manualDescription,
      }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    if (response.ok) {
      setManualUser(null);
      setManualCandidates([]);
      setManualUserQuery("");
      setManualAmount("0");
      setManualDescription("");
      await loadItems();
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Payments"
        description="Review submitted transfers, approve or reject them, and record manual settlements with a complete audit trail."
        badge="Payments Control"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Filter transactions, inspect details, and confirm submitted transfers.</p>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
      </section>

      {canCreate ? (
        <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <h2 className="text-lg font-semibold text-[#1F2937]">Manual Payment Record</h2>
          <p className="mt-1 text-sm text-slate-500">Record and immediately approve levy, fine, pledge, lateness, or absent fee payments for a member.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={manualUserQuery}
              onChange={(event) => setManualUserQuery(event.target.value)}
              placeholder="Search member by name or email"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              disabled={isSearchingMembers}
              onClick={() => void searchManualUsers()}
              className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSearchingMembers ? "Searching..." : "Search Member"}
            </button>
          </div>
          {manualCandidates.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {manualCandidates.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setManualUser(member);
                    const firstPayableCategory = (["LEVY", "FINE", "LATENESS_FEE", "ABSENT_FEE", "PLEDGE"] as const).find(
                      (category) => member.owedByCategory[category] > 0,
                    );
                    setManualCategory(firstPayableCategory ?? "LEVY");
                    setManualAmount("0");
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left ${
                    manualUser?.id === member.id ? "border-[#2CA6A4] bg-[#EAF9F8]" : "border-slate-200 bg-[#F8FAFA]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#1F2937]">{formatDisplayName(member.firstName, member.lastName)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {member.owedGroups.length > 0
                      ? member.owedGroups.map((group) => `${group.label}: ${formatNaira(group.amount)}`).join(" • ")
                      : "No outstanding dues."}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select
              value={manualCategory}
              onChange={(event) => {
                const nextCategory = event.target.value as typeof manualCategory;
                setManualCategory(nextCategory);
                setManualAmount((current) => {
                  const numericValue = Number(current || 0);
                  const nextOutstanding = manualUser?.owedByCategory[nextCategory] ?? 0;
                  if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    return current;
                  }
                  return String(Math.min(numericValue, nextOutstanding));
                });
              }}
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            >
              <option value="LEVY" disabled={Boolean(manualUser) && (manualUser?.owedByCategory.LEVY ?? 0) <= 0}>Levy</option>
              <option value="FINE" disabled={Boolean(manualUser) && (manualUser?.owedByCategory.FINE ?? 0) <= 0}>Fine</option>
              <option value="LATENESS_FEE" disabled={Boolean(manualUser) && (manualUser?.owedByCategory.LATENESS_FEE ?? 0) <= 0}>Lateness Fee</option>
              <option value="ABSENT_FEE" disabled={Boolean(manualUser) && (manualUser?.owedByCategory.ABSENT_FEE ?? 0) <= 0}>Absent Fee</option>
              <option value="PLEDGE" disabled={Boolean(manualUser) && (manualUser?.owedByCategory.PLEDGE ?? 0) <= 0}>Pledge</option>
            </select>
            <input
              type="number"
              min="0"
              max={selectedManualOutstanding || undefined}
              value={manualAmount}
              onChange={(event) => {
                const nextValue = event.target.value;
                const numericValue = Number(nextValue || 0);

                if (!nextValue) {
                  setManualAmount("");
                  return;
                }

                if (!Number.isFinite(numericValue)) {
                  return;
                }

                setManualAmount(String(Math.min(numericValue, selectedManualOutstanding || numericValue)));
              }}
              placeholder="Amount"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <input
              value={manualDescription}
              onChange={(event) => setManualDescription(event.target.value)}
              placeholder="Description or note"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
          </div>
          {manualUser ? (
            <p className="mt-3 text-sm text-slate-500">
              Outstanding for {manualCategory.replaceAll("_", " ").toLowerCase()}:{" "}
              <span className="font-semibold text-[#1E8C8A]">{formatNaira(selectedManualOutstanding)}</span>
            </p>
          ) : null}
          <button
            type="button"
            disabled={isSaving || !manualUser || selectedManualOutstanding <= 0}
            onClick={() => void recordManualPayment()}
            className="mt-4 rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Record Approved Payment"}
          </button>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value as typeof status;
              setStatus(nextStatus);
            }}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by member name or email"
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void loadItems(1, status, query)}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white"
          >
            Search
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        {isLoading ? <p className="text-sm text-slate-600">Loading payments...</p> : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void openDetails(item.id)}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 text-left shadow-[0_12px_28px_rgba(31,41,55,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[#1F2937]">
                  {item.user ? formatDisplayName(item.user.firstName, item.user.lastName) : "User Payment"}
                </p>
                <p className="mt-1 text-sm text-slate-500">{item.user?.email ?? item.transactionType}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${excuseStatusClasses[item.status]}`}>{item.status}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-[#1F2937]">{formatNaira(item.totalAmount)}</p>
              <p className="text-xs text-slate-500">{formatAppDateTime(item.submittedAt)}</p>
            </div>
          </button>
        ))}
        {pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => void loadItems(Math.max(1, pagination.page - 1), status, query)}
              className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-slate-600">Page {pagination.page} of {pagination.totalPages}</p>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void loadItems(Math.min(pagination.totalPages, pagination.page + 1), status, query)}
              className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[#9FD6D5]/70 bg-white shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6F3F2] px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  {selectedItem.user ? formatDisplayName(selectedItem.user.firstName, selectedItem.user.lastName) : "Payment Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.user?.email ?? selectedItem.transactionType}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Status</p>
                    <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${excuseStatusClasses[selectedItem.status]}`}>
                      {selectedItem.status}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1F2937]">{formatNaira(selectedItem.totalAmount)}</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">Submitted {formatAppDateTime(selectedItem.submittedAt)}</p>
              </section>

              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Items</h3>
                <div className="mt-3 grid gap-2">
                  {selectedItem.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="rounded-2xl bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1F2937]">{item.description}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.category.replaceAll("_", " ")}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#1F2937]">{formatNaira(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <div className="flex flex-wrap gap-3">
                  {canApprove && selectedItem.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void updateSelected("APPROVE")}
                        className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setRejectTarget(selectedItem)}
                        className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedItem)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 text-red-500"
                      aria-label="Delete payment transaction"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16" />
                        <path d="M9 7V5h6v2" />
                        <path d="M7 7l1 12h8l1-12" />
                        <path d="M10 11v5" />
                        <path d="M14 11v5" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(message)}
        title="Payments"
        message={message ?? ""}
        onClose={() => setMessage(null)}
      />
      <ActionModal
        open={Boolean(deleteTarget)}
        title="Delete Payment"
        message="This will permanently delete this payment record from the system. This action cannot be undone."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void deleteItem()}
        confirmLabel="Delete"
        tone="danger"
        isProcessing={isSaving}
      />
      <ActionModal
        open={Boolean(rejectTarget)}
        title="Reject Payment"
        message="Rejecting this payment will mark it as rejected and it will not settle the member's dues. Continue only if you are sure."
        onClose={() => setRejectTarget(null)}
        onConfirm={async () => {
          if (!rejectTarget) return;
          await updateSelected("REJECT", rejectTarget);
          setRejectTarget(null);
        }}
        confirmLabel="Reject"
        tone="danger"
        isProcessing={isSaving}
      />
    </div>
  );
}
