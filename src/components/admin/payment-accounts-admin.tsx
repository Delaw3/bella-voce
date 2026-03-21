"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { ActionModal } from "@/components/ui/action-modal";
import { PaymentAccountItem } from "@/types/payments";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AccountsResponse = {
  items?: PaymentAccountItem[];
  message?: string;
};

export function PaymentAccountsAdmin() {
  const router = useRouter();
  const canCreate = useCan("payment_accounts.create");
  const canEdit = useCan("payment_accounts.edit");
  const canDelete = useCan("payment_accounts.delete");
  const [items, setItems] = useState<PaymentAccountItem[]>([]);
  const [editingItem, setEditingItem] = useState<PaymentAccountItem | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccountItem | null>(null);

  async function loadItems() {
    setIsLoading(true);
    const response = await fetch("/api/admin/payment-accounts");
    const payload = (await response.json()) as AccountsResponse;

    if (response.ok) {
      setItems(payload.items ?? []);
    } else {
      setMessage(payload.message ?? "Unable to load payment accounts.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function resetForm() {
    setEditingItem(null);
    setAccountName("");
    setAccountNumber("");
    setBankName("");
    setIsActive(true);
  }

  function startEdit(item: PaymentAccountItem) {
    setEditingItem(item);
    setAccountName(item.accountName);
    setAccountNumber(item.accountNumber);
    setBankName(item.bankName);
    setIsActive(item.isActive);
  }

  async function saveItem() {
    setIsSaving(true);
    const response = await fetch(
      editingItem ? `/api/admin/payment-accounts/${editingItem.id}` : "/api/admin/payment-accounts",
      {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountNumber, bankName, isActive }),
      },
    );
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);

    if (response.ok) {
      resetForm();
      await loadItems();
    }
    setIsSaving(false);
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setIsSaving(true);
    const response = await fetch(`/api/admin/payment-accounts/${deleteTarget.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setDeleteTarget(null);
    if (response.ok) {
      await loadItems();
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Payment Accounts"
        description="Manage the Bella Voce bank accounts members should transfer to before they submit payment confirmation."
        badge="Bank Accounts"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Create, edit, activate, or delete transfer accounts for members.</p>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
      </section>

      {canCreate || canEdit ? (
        <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Account name"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="Account number"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <input
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Bank name"
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active account
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveItem()}
              className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingItem ? "Update Account" : "Add Account"}
            </button>
            {editingItem ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[#9FD6D5] px-5 py-3 text-sm font-semibold text-[#1E8C8A]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        {isLoading ? <p className="text-sm text-slate-600">Loading payment accounts...</p> : null}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_12px_28px_rgba(31,41,55,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#1F2937]">{item.accountName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.accountNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{item.bankName}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isActive ? "bg-[#EAF9F8] text-[#1E8C8A]" : "bg-slate-100 text-slate-500"}`}>
                {item.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-2xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A]"
                >
                  Edit
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 text-red-500"
                  aria-label="Delete payment account"
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
          </div>
        ))}
      </section>

      <ActionModal
        open={Boolean(message)}
        title="Payment Accounts"
        message={message ?? ""}
        onClose={() => setMessage(null)}
      />
      <ActionModal
        open={Boolean(deleteTarget)}
        title="Delete Payment Account"
        message="This bank account will be removed from Bella Voce payment instructions."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void deleteItem()}
        confirmLabel="Delete"
        tone="danger"
        isProcessing={isSaving}
      />
    </div>
  );
}
