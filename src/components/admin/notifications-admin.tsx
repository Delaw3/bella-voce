"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { formatDisplayName } from "@/lib/utils";
import { AdminMemberItem, AdminNotificationItem } from "@/types/admin";
import { useEffect, useState } from "react";

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

  async function loadData() {
    setIsLoading(true);
    const [notificationsResponse, membersResponse] = await Promise.all([
      fetch("/api/admin/notifications"),
      fetch("/api/admin/members"),
    ]);

    const notificationsPayload = (await notificationsResponse.json()) as {
      notifications?: AdminNotificationItem[];
      message?: string;
    };
    const membersPayload = (await membersResponse.json()) as { members?: AdminMemberItem[] };

    if (notificationsResponse.ok) {
      setNotifications(notificationsPayload.notifications ?? []);
    } else {
      setFeedback(notificationsPayload.message ?? "Unable to load notifications.");
    }

    if (membersResponse.ok) {
      setMembers(membersPayload.members ?? []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [notificationsResponse, membersResponse] = await Promise.all([
        fetch("/api/admin/notifications"),
        fetch("/api/admin/members"),
      ]);

      const notificationsPayload = (await notificationsResponse.json()) as {
        notifications?: AdminNotificationItem[];
        message?: string;
      };
      const membersPayload = (await membersResponse.json()) as { members?: AdminMemberItem[] };

      if (cancelled) return;

      if (notificationsResponse.ok) {
        setNotifications(notificationsPayload.notifications ?? []);
      } else {
        setFeedback(notificationsPayload.message ?? "Unable to load notifications.");
      }

      if (membersResponse.ok) {
        setMembers(membersPayload.members ?? []);
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
            <select
              value={form.userId}
              onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
              className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            >
              <option value="">Select user</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {formatDisplayName(member.firstName, member.lastName)}
                </option>
              ))}
            </select>
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
    </div>
  );
}
