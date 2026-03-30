"use client";

import { useCan } from "@/components/admin/admin-session-provider";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ThemedDateInput } from "@/components/ui/themed-date-input";
import { formatPsalmistMonthLabel } from "@/lib/psalmist";
import { formatAppDate, formatDisplayName, formatInitials } from "@/lib/utils";
import { AdminMemberItem, AdminPsalmistItem } from "@/types/admin";
import { useEffect, useMemo, useState } from "react";

type FeedbackState = null | {
  title: string;
  message: string;
  tone: "success" | "error";
};

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PsalmistAdmin() {
  const canCreate = useCan("psalmist.create");
  const canEdit = useCan("psalmist.edit");
  const canDelete = useCan("psalmist.delete");
  const [items, setItems] = useState<AdminPsalmistItem[]>([]);
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [search, setSearch] = useState("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notifySelectedUser, setNotifySelectedUser] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [feedbackModal, setFeedbackModal] = useState<FeedbackState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedUserId) ?? null,
    [members, selectedUserId],
  );

  const filteredMembers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) {
      return members;
    }

    return members.filter((member) =>
      [member.firstName, member.lastName, member.email, member.username, member.voicePart]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [members, userSearch]);

  function resetForm() {
    setEditingId(null);
    setAssignmentDate("");
    setSelectedUserId("");
    setNotifySelectedUser(true);
  }

  function showFeedback(title: string, message: string, tone: "success" | "error" = "success") {
    setFeedbackModal({ title, message, tone });
  }

  async function fetchMembers() {
    const response = await fetch("/api/admin/members?purpose=selector");
    const payload = (await response.json()) as { members?: AdminMemberItem[]; message?: string };
    if (response.ok) {
      setMembers(payload.members ?? []);
      return;
    }

    showFeedback("Unable to Load Users", payload.message ?? "Unable to load users for psalmist selection.", "error");
  }

  async function loadItems(month = selectedMonth, query = search) {
    setIsLoading(true);

    const params = new URLSearchParams({ month });
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const response = await fetch(`/api/admin/psalmist?${params.toString()}`);
    const payload = (await response.json()) as { items?: AdminPsalmistItem[]; message?: string };

    if (response.ok) {
      setItems(payload.items ?? []);
    } else {
      showFeedback("Unable to Load", payload.message ?? "Unable to load psalmist schedule.", "error");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await Promise.all([fetchMembers(), loadItems(selectedMonth, "")]);
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadItems(selectedMonth, search);
  }, [selectedMonth]);

  async function handleSubmit() {
    setIsSubmitting(true);

    const response = await fetch(editingId ? `/api/admin/psalmist/${editingId}` : "/api/admin/psalmist", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentDate,
        userId: selectedUserId,
        notifySelectedUser,
      }),
    });

    const payload = (await response.json()) as { message?: string };

    if (response.ok) {
      showFeedback(
        editingId ? "Psalmist Updated" : "Psalmist Selected",
        payload.message ?? (editingId ? "Psalmist assignment updated successfully." : "Psalmist assignment created successfully."),
      );
      resetForm();
      setSelectedMonth(assignmentDate.slice(0, 7) || selectedMonth);
      await loadItems(assignmentDate.slice(0, 7) || selectedMonth, search);
    } else {
      showFeedback("Action Failed", payload.message ?? "Unable to save psalmist assignment.", "error");
    }

    setIsSubmitting(false);
  }

  async function deleteItem(id: string) {
    setIsDeleting(true);
    const response = await fetch(`/api/admin/psalmist/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };

    if (response.ok) {
      showFeedback("Psalmist Deleted", payload.message ?? "Psalmist assignment deleted successfully.");
      await loadItems();
    } else {
      showFeedback("Delete Failed", payload.message ?? "Unable to delete psalmist assignment.", "error");
    }

    setConfirmDeleteId(null);
    setIsDeleting(false);
  }

  function startEdit(item: AdminPsalmistItem) {
    setEditingId(item.id);
    setAssignmentDate(item.assignmentDate.slice(0, 10));
    setSelectedUserId(item.user?.id ?? "");
    setNotifySelectedUser(true);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Psalmist"
        description="Assign a psalmist to each service date, review monthly schedules, and notify the selected member immediately."
        badge="Operational Admin"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <ThemedDateInput value={assignmentDate} onChange={setAssignmentDate} placeholder="Select assignment date" />

          <button
            type="button"
            onClick={() => setIsUserPickerOpen(true)}
            className="flex min-h-13 items-center justify-between gap-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-left text-sm transition hover:bg-white"
          >
            <div className="min-w-0">
              <p className={`truncate font-medium ${selectedMember ? "text-[#1F2937]" : "text-slate-500"}`}>
                {selectedMember ? formatDisplayName(selectedMember.firstName, selectedMember.lastName) : "Select user"}
              </p>
              {selectedMember ? <p className="truncate text-xs text-slate-500">{selectedMember.voicePart || selectedMember.email}</p> : null}
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#1E8C8A]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <label className="flex min-h-13 items-center gap-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937]">
            <input
              type="checkbox"
              checked={notifySelectedUser}
              onChange={(event) => setNotifySelectedUser(event.target.checked)}
              className="h-4 w-4 accent-[#2CA6A4]"
            />
            Notify selected user
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={editingId ? !canEdit || isSubmitting : !canCreate || isSubmitting}
            onClick={() => void handleSubmit()}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isSubmitting ? (editingId ? "Saving..." : "Creating...") : editingId ? "Save Changes" : "Create Assignment"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-[#9FD6D5] px-5 py-3 text-sm font-semibold text-[#1E8C8A]"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Search user</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by member name, email, username, or voice part"
              className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="w-full rounded-2xl border border-[#9FD6D5] px-4 py-3 text-sm font-semibold text-[#1E8C8A]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1F2937]">{formatPsalmistMonthLabel(selectedMonth)}</p>
          <p className="text-xs text-slate-500">{items.length} assignment{items.length === 1 ? "" : "s"}</p>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading psalmist schedule...</p> : null}
      {!isLoading && items.length === 0 ? <EmptyState message="No psalmist assignments found for this month." /> : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-[#9FD6D5]/70 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar
                  src={item.user?.profilePicture}
                  alt={item.user?.displayName ?? "Psalmist"}
                  initials={formatInitials(item.user?.firstName, item.user?.lastName)}
                  size={52}
                  className="h-13 w-13 border border-[#9FD6D5]/70"
                  fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[#1F2937]">{item.user?.displayName ?? "Unknown member"}</p>
                  <p className="text-sm text-slate-600">{formatAppDate(item.assignmentDate)}</p>
                  {item.user?.voicePart ? <p className="mt-1 text-xs text-[#1E8C8A]">{item.user.voicePart}</p> : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="rounded-2xl border border-red-200 p-2 text-red-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18M8 6V4h8v2M7 6l1 14h8l1-14M10 10v6M14 10v6" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ActionModal
        open={Boolean(feedbackModal)}
        title={feedbackModal?.title ?? ""}
        message={feedbackModal?.message ?? ""}
        tone={feedbackModal?.tone === "success" ? "success" : "danger"}
        onClose={() => setFeedbackModal(null)}
      />

      <ActionModal
        open={Boolean(confirmDeleteId)}
        title="Delete Psalmist Assignment?"
        message="This assignment will be removed from the psalmist schedule."
        tone="danger"
        confirmLabel="Delete Assignment"
        isProcessing={isDeleting}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteId ? () => void deleteItem(confirmDeleteId) : undefined}
      />

      {isUserPickerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1F2937]">Select Psalmist</h3>
                <p className="mt-1 text-sm text-slate-600">Search members and pick who should serve for the selected date.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUserPickerOpen(false)}
                className="rounded-2xl border border-[#9FD6D5] p-2 text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3">
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name, email, username, or voice part"
                className="w-full bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No users match your search.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = member.id === selectedUserId;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(member.id);
                        setIsUserPickerOpen(false);
                      }}
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
