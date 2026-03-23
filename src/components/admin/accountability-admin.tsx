"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { formatAppDateTime, formatDisplayName, formatInitials } from "@/lib/utils";
import {
  AdminAccountabilityAdjustmentItem,
  AdminAccountabilityItem,
  AdminMemberItem,
} from "@/types/admin";
import { useEffect, useMemo, useState } from "react";

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
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminAccountabilityItem | null>(null);
  const [entryItems, setEntryItems] = useState<AdminAccountabilityAdjustmentItem[]>([]);
  const [formType, setFormType] = useState<AdjustmentType>("LEVY");
  const [formAmount, setFormAmount] = useState("0");
  const [formReason, setFormReason] = useState("");
  const [bulkLevyAmount, setBulkLevyAmount] = useState("0");
  const [bulkLevyReason, setBulkLevyReason] = useState("");
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [bulkUserSearch, setBulkUserSearch] = useState("");
  const [isBulkUserPickerOpen, setIsBulkUserPickerOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success">("default");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<AdminAccountabilityAdjustmentItem | null>(null);

  const filteredBulkMembers = useMemo(() => {
    const search = bulkUserSearch.trim().toLowerCase();

    if (!search) {
      return members;
    }

    return members.filter((member) =>
      [member.firstName, member.lastName, member.email, member.username, member.voicePart]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [bulkUserSearch, members]);

  const selectedBulkMembers = useMemo(() => {
    const selectedIds = new Set(selectedBulkUserIds);
    return members.filter((member) => selectedIds.has(member.id));
  }, [members, selectedBulkUserIds]);

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

  async function loadMembers() {
    const response = await fetch("/api/admin/members?purpose=selector");
    const payload = (await response.json()) as { members?: AdminMemberItem[]; message?: string };

    if (response.ok) {
      const nextMembers = payload.members ?? [];
      setMembers(nextMembers);
      setSelectedBulkUserIds((current) => {
        if (current.length > 0) {
          return current.filter((userId) => nextMembers.some((member) => member.id === userId));
        }

        return nextMembers.map((member) => member.id);
      });
      return;
    }

    setMessage(payload.message ?? "Unable to load members for bulk levy.");
    setMessageTone("default");
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
      const [accountabilityResponse, membersResponse] = await Promise.all([
        fetch("/api/admin/accountability"),
        fetch("/api/admin/members?purpose=selector"),
      ]);
      const [accountabilityPayload, membersPayload] = (await Promise.all([
        accountabilityResponse.json(),
        membersResponse.json(),
      ])) as [AccountabilityResponse, { members?: AdminMemberItem[]; message?: string }];

      if (cancelled) return;

      if (accountabilityResponse.ok) {
        setItems(accountabilityPayload.items ?? []);
      } else {
        setMessage(accountabilityPayload.message ?? "Unable to load accountability records.");
        setMessageTone("default");
      }

      if (membersResponse.ok) {
        const nextMembers = membersPayload.members ?? [];
        setMembers(nextMembers);
        setSelectedBulkUserIds(nextMembers.map((member) => member.id));
      } else {
        setMessage(membersPayload.message ?? "Unable to load members for bulk levy.");
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

  async function saveBulkLevy() {
    const normalizedAmount = Number(bulkLevyAmount || 0);
    const normalizedReason = bulkLevyReason.trim();

    if (selectedBulkUserIds.length === 0) {
      setMessage("Select at least one user for the levy.");
      setMessageTone("default");
      return;
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      setMessage("Bulk levy amount must be a valid number of 0 or more.");
      setMessageTone("default");
      return;
    }

    if (!normalizedReason) {
      setMessage("Bulk levy reason is required.");
      setMessageTone("default");
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/admin/accountability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: selectedBulkUserIds,
        type: "LEVY",
        amount: normalizedAmount,
        reason: normalizedReason,
      }),
    });

    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setMessageTone(response.ok ? "success" : "default");

    if (response.ok) {
      setBulkLevyAmount("0");
      setBulkLevyReason("");
      await loadItems(query.trim());
    }

    setIsSaving(false);
  }

  function toggleBulkUser(userId: string) {
    setSelectedBulkUserIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
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

      {canEditItems ? (
        <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">Bulk Levy</h2>
              <p className="mt-1 text-sm text-slate-600">
                Send the same levy to many users at once, then deselect any members you want to exclude.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Amount</span>
                <input
                  type="number"
                  min="0"
                  value={bulkLevyAmount}
                  onChange={(event) => setBulkLevyAmount(event.target.value)}
                  className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Reason</span>
                <input
                  value={bulkLevyReason}
                  onChange={(event) => setBulkLevyReason(event.target.value)}
                  placeholder="Enter levy reason"
                  className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkUserPickerOpen(true)}
                className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
              >
                Choose Users
              </button>
              <button
                type="button"
                onClick={() => setSelectedBulkUserIds(members.map((member) => member.id))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedBulkUserIds([])}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear All
              </button>
              <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
                {selectedBulkUserIds.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedBulkMembers.slice(0, 8).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleBulkUser(member.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-2 text-xs font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
                >
                  <span>{formatDisplayName(member.firstName, member.lastName)}</span>
                  <span className="text-sm leading-none">x</span>
                </button>
              ))}
              {selectedBulkMembers.length > 8 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  +{selectedBulkMembers.length - 8} more
                </span>
              ) : null}
            </div>

            <div>
              <button
                type="button"
                disabled={isSaving || selectedBulkUserIds.length === 0}
                onClick={() => void saveBulkLevy()}
                className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
              >
                {isSaving ? "Sending Levy..." : "Send Levy to Selected Users"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
                <ProfileAvatar
                  src={item.profilePicture}
                  alt={formatDisplayName(item.firstName, item.lastName)}
                  initials={formatInitials(item.firstName, item.lastName)}
                  size={44}
                  className="h-11 w-11 border border-[#9FD6D5]/70"
                  fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
                />
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
                          <p className="text-sm font-semibold text-[#1F2937]">N{entry.amount.toLocaleString()}</p>
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

      {isBulkUserPickerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1F2937]">Select Levy Recipients</h3>
                <p className="mt-1 text-sm text-slate-600">Everyone starts selected. Tap any member to remove or add them back.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkUserPickerOpen(false)}
                className="rounded-2xl border border-[#9FD6D5] p-2 text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedBulkUserIds(members.map((member) => member.id))}
                className="rounded-2xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A]"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedBulkUserIds([])}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => void loadMembers()}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Refresh Users
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3">
              <input
                value={bulkUserSearch}
                onChange={(event) => setBulkUserSearch(event.target.value)}
                placeholder="Search by name, email, username, or voice part"
                className="w-full bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {filteredBulkMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No users match your search.
                </div>
              ) : (
                filteredBulkMembers.map((member) => {
                  const isSelected = selectedBulkUserIds.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleBulkUser(member.id)}
                      className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[#2CA6A4] bg-[#EAF9F8] shadow-[0_10px_24px_rgba(44,166,164,0.12)]"
                          : "border-[#9FD6D5]/70 bg-white hover:bg-[#F8FAFA]"
                      }`}
                    >
                      <ProfileAvatar
                        src={member.profilePicture}
                        alt={formatDisplayName(member.firstName, member.lastName)}
                        initials={formatInitials(member.firstName, member.lastName)}
                        size={56}
                        className="h-14 w-14 border border-[#9FD6D5]/70"
                        fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">
                          {formatDisplayName(member.firstName, member.lastName)}
                        </p>
                        <p className="truncate text-xs text-slate-500">{member.email}</p>
                        {member.voicePart ? <p className="mt-1 text-[11px] text-[#1E8C8A]">{member.voicePart}</p> : null}
                      </div>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isSelected ? "bg-[#2CA6A4] text-white" : "border border-slate-200 text-slate-400"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
