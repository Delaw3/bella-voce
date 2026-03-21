"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { formatAppDateTime, formatDisplayName } from "@/lib/utils";
import {
  AdminAccountabilityAdjustmentItem,
  AdminAccountabilityItem,
} from "@/types/admin";
import Image from "next/image";
import { useEffect, useState } from "react";

type AccountabilityResponse = { items?: AdminAccountabilityItem[]; message?: string };
type AccountabilityEntryResponse = { items?: AdminAccountabilityAdjustmentItem[]; message?: string };
type AdjustmentType = "PLEDGED" | "FINE" | "LEVY";

const TYPE_OPTIONS: Array<{ value: AdjustmentType; label: string }> = [
  { value: "PLEDGED", label: "Pledged" },
  { value: "FINE", label: "Fine" },
  { value: "LEVY", label: "Levy" },
];

export function AccountabilityAdmin() {
  const canViewItems = useCan("accountability_items.view");
  const canEditItems = useCan("accountability_items.edit");
  const canDeleteItems = useCan("accountability_items.delete");
  const [items, setItems] = useState<AdminAccountabilityItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminAccountabilityItem | null>(null);
  const [entryItems, setEntryItems] = useState<AdminAccountabilityAdjustmentItem[]>([]);
  const [formType, setFormType] = useState<AdjustmentType>("LEVY");
  const [formAmount, setFormAmount] = useState("0");
  const [formReason, setFormReason] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success">("default");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<AdminAccountabilityAdjustmentItem | null>(null);

  async function loadItems(search = "") {
    setIsLoading(true);
    const response = await fetch(`/api/admin/accountability?q=${encodeURIComponent(search)}`);
    const payload = (await response.json()) as AccountabilityResponse;
    if (response.ok) {
      setItems(payload.items ?? []);
      setSelectedItem((current) =>
        current ? (payload.items ?? []).find((item) => item.userId === current.userId) ?? null : current,
      );
    } else {
      setMessage(payload.message ?? "Unable to load accountability records.");
      setMessageTone("default");
    }
    setIsLoading(false);
  }

  async function loadEntryItems(userId: string) {
    if (!canViewItems) {
      setEntryItems([]);
      return;
    }

    setIsLoadingEntries(true);
    const response = await fetch(`/api/admin/accountability?userId=${encodeURIComponent(userId)}`);
    const payload = (await response.json()) as AccountabilityEntryResponse;

    if (response.ok) {
      setEntryItems(payload.items ?? []);
    } else {
      setMessage(payload.message ?? "Unable to load accountability items.");
      setMessageTone("default");
    }

    setIsLoadingEntries(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/accountability");
      const payload = (await response.json()) as AccountabilityResponse;

      if (cancelled) return;

      if (response.ok) {
        setItems(payload.items ?? []);
      } else {
        setMessage(payload.message ?? "Unable to load accountability records.");
        setMessageTone("default");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetEntryForm() {
    setFormType("LEVY");
    setFormAmount("0");
    setFormReason("");
    setEditingEntryId(null);
  }

  async function openMemberModal(item: AdminAccountabilityItem) {
    setSelectedItem(item);
    resetEntryForm();
    setEntryItems([]);
    if (canViewItems) {
      await loadEntryItems(item.userId);
    }
  }

  async function refreshSelectedUser() {
    if (!selectedItem) return;

    await loadItems(query.trim());
    if (canViewItems) {
      await loadEntryItems(selectedItem.userId);
    }
  }

  function startEditingEntry(entry: AdminAccountabilityAdjustmentItem) {
    setEditingEntryId(entry.id);
    setFormType(entry.type);
    setFormAmount(String(entry.amount));
    setFormReason(entry.reason);
  }

  async function saveSelectedItem() {
    if (!selectedItem) return;

    setIsSaving(true);
    const response = await fetch("/api/admin/accountability", {
      method: editingEntryId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedItem.userId,
        itemId: editingEntryId,
        type: formType,
        amount: Number(formAmount || 0),
        reason: formReason,
      }),
    });

    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setMessageTone(response.ok ? "success" : "default");

    if (response.ok) {
      resetEntryForm();
      await refreshSelectedUser();
    }

    setIsSaving(false);
  }

  async function deleteEntry() {
    if (!entryToDelete) return;

    setIsSaving(true);
    const response = await fetch(`/api/admin/accountability?id=${encodeURIComponent(entryToDelete.id)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { message?: string };

    setMessage(payload.message ?? null);
    setMessageTone(response.ok ? "success" : "default");

    if (response.ok) {
      if (editingEntryId === entryToDelete.id) {
        resetEntryForm();
      }
      await refreshSelectedUser();
    }

    setEntryToDelete(null);
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Accountability"
        description="Open a member to manage pledged, fine, and levy adjustments with clear reasons."
        badge="Operational Admin"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member by name or email"
            className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none focus:border-[#2CA6A4]"
          />
          <button
            type="button"
            onClick={() => void loadItems(query.trim())}
            disabled={isLoading}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Search"}
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading accountability records...</p> : null}
      {!isLoading && items.length === 0 ? <EmptyState message="No accountability records found." /> : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <button
            key={item.userId}
            type="button"
            onClick={() => void openMemberModal(item)}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 text-left shadow-[0_12px_28px_rgba(31,41,55,0.06)] transition hover:border-[#2CA6A4]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {item.profilePicture ? (
                  <Image
                    src={item.profilePicture}
                    alt={formatDisplayName(item.firstName, item.lastName)}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF9F8] text-sm font-semibold text-[#1E8C8A]">
                    {item.firstName.slice(0, 1)}
                    {item.lastName.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-[#1F2937]">
                    {formatDisplayName(item.firstName, item.lastName)}
                  </h2>
                  <p className="text-sm text-slate-500">{item.email}</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[#9FD6D5]/70 bg-white shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6F3F2] px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  {formatDisplayName(selectedItem.firstName, selectedItem.lastName)}
                </h2>
                <p className="text-sm text-slate-500">{selectedItem.email}</p>
                {selectedItem.finance.updatedAt ? (
                  <p className="mt-1 text-xs font-semibold text-[#1E8C8A]">
                    Updated {formatAppDateTime(selectedItem.finance.updatedAt)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-slate-500">No adjustment saved yet</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              {canEditItems ? (
                <div className="rounded-[26px] bg-[#F8FAFA] p-4">
                  <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                        Item Type
                      </span>
                      <select
                        value={formType}
                        onChange={(event) => setFormType(event.target.value as AdjustmentType)}
                        className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                      >
                        {TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                        Amount
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={formAmount}
                        onChange={(event) => setFormAmount(event.target.value)}
                        className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                      Reason
                    </span>
                    <textarea
                      rows={4}
                      value={formReason}
                      onChange={(event) => setFormReason(event.target.value)}
                      placeholder="Enter reason"
                      className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void saveSelectedItem()}
                      className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : editingEntryId ? "Update Item" : "Save Item"}
                    </button>
                    {editingEntryId ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={resetEntryForm}
                        className="rounded-2xl border border-[#9FD6D5] px-5 py-3 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {canViewItems ? <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Saved Items
                  </h3>
                </div>

                {isLoadingEntries ? (
                  <p className="text-sm text-slate-600">Loading saved items...</p>
                ) : null}

                {!isLoadingEntries && entryItems.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#9FD6D5] bg-[#F8FAFA] px-4 py-5 text-sm text-slate-500">
                    No accountability item has been added yet.
                  </div>
                ) : null}

                {entryItems.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {entryItems.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[24px] border border-[#DDEEEE] bg-[#F8FAFA] p-4 shadow-[0_10px_24px_rgba(31,41,55,0.05)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
                            {TYPE_OPTIONS.find((option) => option.value === entry.type)?.label ?? entry.type}
                          </span>
                          <p className="text-sm font-semibold text-[#1F2937]">₦{entry.amount.toLocaleString()}</p>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">{entry.reason}</p>
                        <p className="mt-3 text-xs text-slate-500">Updated {formatAppDateTime(entry.updatedAt)}</p>

                        <div className="mt-4 flex items-center gap-3">
                          {canEditItems ? (
                            <button
                              type="button"
                              onClick={() => startEditingEntry(entry)}
                              className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
                            >
                              Edit
                            </button>
                          ) : null}
                          {canDeleteItems ? (
                            <button
                              type="button"
                              onClick={() => setEntryToDelete(entry)}
                              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 text-red-500 transition hover:bg-red-50"
                              aria-label="Delete accountability item"
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
                  </div>
                ) : null}
              </div> : null}
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(message)}
        title="Accountability"
        message={message ?? ""}
        onClose={() => setMessage(null)}
        tone={messageTone}
      />
      <ActionModal
        open={Boolean(entryToDelete)}
        title="Delete Accountability Item"
        message="This entry will be removed from the member's accountability list."
        onClose={() => setEntryToDelete(null)}
        onConfirm={() => void deleteEntry()}
        confirmLabel="Delete"
        tone="danger"
        isProcessing={isSaving}
      />
    </div>
  );
}
