"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { formatAppDate } from "@/lib/utils";
import { AdminChoirFinanceItem } from "@/types/admin";
import { ChoirFinanceResponse } from "@/types/dashboard";
import { useEffect, useState } from "react";

const initialForm = {
  type: "INCOME",
  amount: "",
  description: "",
  financeDate: "",
};

export function ChoirFinanceAdmin() {
  const canCreate = useCan("choir_finance.create");
  const canEdit = useCan("choir_finance.edit");
  const canDelete = useCan("choir_finance.delete");
  const [data, setData] = useState<ChoirFinanceResponse>({
    summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
    entries: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function loadEntries() {
    setIsLoading(true);
    const response = await fetch("/api/admin/choir-finance");
    const payload = (await response.json()) as ChoirFinanceResponse & { message?: string };
    if (response.ok) {
      setData(payload);
    } else {
      setMessage(payload.message ?? "Unable to load choir finance records.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/choir-finance");
      const payload = (await response.json()) as ChoirFinanceResponse & { message?: string };

      if (cancelled) return;

      if (response.ok) {
        setData(payload);
      } else {
        setMessage(payload.message ?? "Unable to load choir finance records.");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitForm() {
    setIsSubmitting(true);
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/admin/choir-finance/${editingId}` : "/api/admin/choir-finance";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);

    if (response.ok) {
      setForm(initialForm);
      setEditingId(null);
      void loadEntries();
    }
    setIsSubmitting(false);
  }

  function startEdit(entry: AdminChoirFinanceItem) {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      amount: String(entry.amount),
      description: entry.description,
      financeDate: entry.financeDate.slice(0, 10),
    });
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/admin/choir-finance/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    if (response.ok) void loadEntries();
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Choir Finance"
        description="Record new income and expenses, edit existing entries, and keep the financial summary current."
        badge="Operational Admin"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Income", value: data.summary.totalIncome },
          { label: "Total Expenses", value: data.summary.totalExpenses },
          { label: "Balance", value: data.summary.balance },
        ].map((item) => (
          <article key={item.label} className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4">
            <p className="text-xs font-semibold tracking-[0.1em] text-[#1E8C8A] uppercase">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#1F2937]">₦ {item.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-3 text-sm outline-none"
          >
            <option value="INCOME">INCOME</option>
            <option value="EXPENSE">EXPENSE</option>
          </select>
          <input
            type="number"
            min="0"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Amount"
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={form.financeDate}
            onChange={(event) => setForm((current) => ({ ...current, financeDate: event.target.value }))}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            disabled={editingId ? !canEdit || isSubmitting : !canCreate || isSubmitting}
            onClick={() => void submitForm()}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isSubmitting ? (editingId ? "Updating..." : "Adding...") : editingId ? "Update Entry" : "Add Entry"}
          </button>
        </div>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Description"
          rows={3}
          className="mt-3 w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
        />
        {message ? <p className="mt-3 text-sm text-[#1E8C8A]">{message}</p> : null}
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading choir finance entries...</p> : null}
      {!isLoading && data.entries.length === 0 ? <EmptyState message="No choir finance entries yet." /> : null}

      <div className="grid gap-3">
        {data.entries.map((entry) => (
          <article key={entry.id} className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">{entry.description}</h2>
                <p className="text-sm text-slate-600">{formatAppDate(entry.financeDate)}</p>
                {entry.postedBy ? <p className="mt-1 text-xs text-slate-500">Posted by {entry.postedBy}</p> : null}
                {entry.editedBy ? <p className="mt-1 text-xs text-slate-500">Edited by {entry.editedBy}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#1E8C8A]">{entry.type}</p>
                <p className="text-lg font-semibold text-[#1F2937]">₦ {entry.amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  className="rounded-2xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A]"
                >
                  Edit Entry
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(entry.id)}
                  disabled={deletingId === entry.id}
                  className="rounded-2xl border border-red-200 p-2 text-red-600 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18M8 6V4h8v2M7 6l1 14h8l1-14M10 10v6M14 10v6" />
                  </svg>
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <ActionModal
        open={Boolean(confirmDeleteId)}
        title="Delete Finance Entry?"
        message="This finance entry will be permanently removed."
        tone="danger"
        confirmLabel="Delete Entry"
        isProcessing={Boolean(confirmDeleteId && deletingId === confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteId ? () => void deleteEntry(confirmDeleteId) : undefined}
      />
    </div>
  );
}
