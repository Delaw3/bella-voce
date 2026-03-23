"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { formatDisplayName, formatInitials } from "@/lib/utils";
import { AdminMemberItem, AdminNotificationItem } from "@/types/admin";
import { useEffect, useMemo, useState } from "react";

export function NotificationsAdmin() {
  const canCreate = useCan("notifications.create");
  const canDelete = useCan("notifications.delete");
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [form, setForm] = useState({
    scope: "ALL",
    userId: "",
    role: "USER",
    title: "",
    message: "",
    type: "INFO",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const selectedMember = useMemo(
    () => members.find((member) => member.id === form.userId) ?? null,
    [members, form.userId],
  );

  const filteredMembers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) {
      return members;
    }

    return members.filter((member) =>
      [
        member.firstName,
        member.lastName,
        member.email,
        member.username,
        member.voicePart,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [members, userSearch]);

  async function fetchNotificationMembers() {
    const response = await fetch("/api/admin/members?purpose=selector");
    const payload = (await response.json()) as { members?: AdminMemberItem[] };

    return {
      ok: response.ok,
      members: payload.members ?? [],
    };
  }

  async function loadData() {
    setIsLoading(true);
    const [notificationsResponse, membersResult] = await Promise.all([
      fetch("/api/admin/notifications"),
      fetchNotificationMembers(),
    ]);

    const notificationsPayload = (await notificationsResponse.json()) as {
      notifications?: AdminNotificationItem[];
      message?: string;
    };

    if (notificationsResponse.ok) {
      setNotifications(notificationsPayload.notifications ?? []);
    } else {
      setFeedback(notificationsPayload.message ?? "Unable to load notifications.");
    }

    if (membersResult.ok) {
      setMembers(membersResult.members);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [notificationsResponse, membersResult] = await Promise.all([
        fetch("/api/admin/notifications"),
        fetchNotificationMembers(),
      ]);

      const notificationsPayload = (await notificationsResponse.json()) as {
        notifications?: AdminNotificationItem[];
        message?: string;
      };

      if (cancelled) return;

      if (notificationsResponse.ok) {
        setNotifications(notificationsPayload.notifications ?? []);
      } else {
        setFeedback(notificationsPayload.message ?? "Unable to load notifications.");
      }

      if (membersResult.ok) {
        setMembers(membersResult.members);
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
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { message?: string };
    setFeedback(payload.message ?? null);
    if (response.ok) {
      setForm({ scope: "ALL", userId: "", role: "USER", title: "", message: "", type: "INFO" });
      setUserSearch("");
      void loadData();
    }
    setIsSubmitting(false);
  }

  async function deleteNotification(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/admin/notifications?id=${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setFeedback(payload.message ?? null);
    if (response.ok) void loadData();
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Notifications"
        description="Send updates to a single member, a role group, or the full choir, then review the latest notification records."
        badge="Operational Admin"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={form.scope}
            onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            <option value="ALL">All Users</option>
            <option value="ROLE">By Role</option>
            <option value="USER">Single User</option>
          </select>
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            <option value="INFO">INFO</option>
            <option value="REMINDER">REMINDER</option>
            <option value="ALERT">ALERT</option>
          </select>

          {form.scope === "ROLE" ? (
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          ) : null}

          {form.scope === "USER" ? (
            <button
              type="button"
              onClick={() => setIsUserPickerOpen(true)}
              className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-left text-sm outline-none transition hover:bg-white"
            >
              <div className="min-w-0">
                <p className={`truncate font-medium ${selectedMember ? "text-[#1F2937]" : "text-slate-500"}`}>
                  {selectedMember ? formatDisplayName(selectedMember.firstName, selectedMember.lastName) : "Select user"}
                </p>
                {selectedMember ? <p className="truncate text-xs text-slate-500">{selectedMember.email}</p> : null}
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#1E8C8A]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          ) : null}
        </div>

        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Notification title"
          className="mt-3 w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
        />
        <textarea
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          placeholder="Notification message"
          rows={4}
          className="mt-3 w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          disabled={!canCreate || isSubmitting}
          onClick={() => void submitForm()}
          className="mt-3 rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send Notification"}
        </button>
        {feedback ? <p className="mt-3 text-sm text-[#1E8C8A]">{feedback}</p> : null}
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading notifications...</p> : null}
      {!isLoading && notifications.length === 0 ? <EmptyState message="No notifications have been created yet." /> : null}

      <div className="grid gap-3">
        {notifications.map((item) => (
          <article key={item.id} className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">{item.title}</h2>
                <p className="text-sm text-slate-700">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.user ? formatDisplayName(item.user.firstName, item.user.lastName) : "Recipient unavailable"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
                  {item.type}
                </span>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={deletingId === item.id}
                    className="rounded-2xl border border-red-200 p-2 text-red-600 disabled:opacity-50"
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
        open={Boolean(confirmDeleteId)}
        title="Delete Notification?"
        message="This notification will be removed from the admin records."
        tone="danger"
        confirmLabel="Delete Notification"
        isProcessing={Boolean(confirmDeleteId && deletingId === confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteId ? () => void deleteNotification(confirmDeleteId) : undefined}
      />

      {isUserPickerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1F2937]">Select User</h3>
                <p className="mt-1 text-sm text-slate-600">Search members and pick who should receive this notification.</p>
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
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, email, username, or voice part"
                  className="w-full bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No users match your search.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = member.id === form.userId;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setForm((current) => ({ ...current, userId: member.id }));
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
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                          {member.voicePart ? (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">{member.voicePart}</span>
                          ) : null}
                          <span className="rounded-full bg-[#EAF9F8] px-2 py-1 text-[#1E8C8A]">{member.role}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2CA6A4] text-white">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        </div>
                      ) : null}
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
