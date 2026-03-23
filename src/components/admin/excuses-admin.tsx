"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import { excuseStatusClasses } from "@/lib/status-styles";
import { formatAppDate, formatAppTime, formatDisplayName, formatInitials } from "@/lib/utils";
import { AdminExcuseItem } from "@/types/admin";
import Image from "next/image";
import { useEffect, useState } from "react";

const excuseStatuses = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

export function ExcusesAdmin() {
  const canEdit = useCan("excuses.edit");
  const canDelete = useCan("excuses.delete");
  const [items, setItems] = useState<AdminExcuseItem[]>([]);
  const [status, setStatus] = useState<(typeof excuseStatuses)[number]>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function loadItems(nextStatus = status) {
    setIsLoading(true);
    const query = nextStatus === "ALL" ? "" : `?status=${nextStatus}`;
    const response = await fetch(`/api/admin/excuses${query}`);
    const payload = (await response.json()) as { excuses?: AdminExcuseItem[]; message?: string };
    if (response.ok) {
      setItems(payload.excuses ?? []);
    } else {
      setMessage(payload.message ?? "Unable to load excuses.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/excuses");
      const payload = (await response.json()) as { excuses?: AdminExcuseItem[]; message?: string };

      if (cancelled) return;

      if (response.ok) {
        setItems(payload.excuses ?? []);
      } else {
        setMessage(payload.message ?? "Unable to load excuses.");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveItem(item: AdminExcuseItem) {
    setSavingId(item.id);
    const response = await fetch(`/api/admin/excuses/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status, adminComment: item.adminComment ?? "" }),
    });

    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    if (response.ok) void loadItems();
    setSavingId(null);
  }

  async function deleteItem(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/admin/excuses/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    if (response.ok) void loadItems();
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  function updateItem(id: string, patch: Partial<AdminExcuseItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Excuses"
        description="Review excuses submitted by members, update their status, and leave an admin comment where needed."
        badge="Operational Admin"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-wrap gap-2">
          {excuseStatuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setStatus(item);
                void loadItems(item);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                status === item
                  ? item === "PENDING"
                    ? "bg-amber-100 text-amber-800"
                    : item === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : item === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-[#2CA6A4] text-white"
                  : "bg-[#EAF9F8] text-[#1E8C8A]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {message ? (
          <p className="mt-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1E8C8A]">{message}</p>
        ) : null}
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading excuses...</p> : null}
      {!isLoading && items.length === 0 ? <EmptyState message="No excuses found for this filter." /> : null}

      <div className="grid gap-3">
        {items.map((item) => {
          const isExpanded = expandedIds.includes(item.id);

          return (
          <article
            key={item.id}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_12px_28px_rgba(31,41,55,0.06)]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    item.user?.profilePicture
                      ? setPreviewImage({
                          src: item.user.profilePicture,
                          alt: formatDisplayName(item.user.firstName, item.user.lastName),
                        })
                      : undefined
                  }
                  className="shrink-0"
                >
                  <ProfileAvatar
                    src={item.user?.profilePicture}
                    alt={item.user ? formatDisplayName(item.user.firstName, item.user.lastName) : "Unknown member"}
                    initials={item.user ? formatInitials(item.user.firstName, item.user.lastName) : "U"}
                    size={44}
                    className="h-11 w-11 border border-[#9FD6D5]/70"
                    fallbackClassName="border-[#9FD6D5]/70 bg-[#EAF9F8] text-[#1E8C8A]"
                  />
                </button>
                <div className="min-w-0">
                  <p className="text-sm text-slate-600">
                    {item.user ? formatDisplayName(item.user.firstName, item.user.lastName) : "Unknown member"}
                  </p>
                  <p className="text-xs text-slate-500">{formatAppDate(item.createdAt)}</p>
                  <p className="text-[11px] text-slate-400">Posted {formatAppTime(item.createdAt)}</p>
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${excuseStatusClasses[item.status]}`}
              >
                {item.status}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[#1F2937]">{item.subject}</h2>
              </div>
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                className="inline-flex items-center gap-2 self-start rounded-full border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
              >
                Details
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {isExpanded ? (
              <>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Excuse Date: {formatAppDate(item.excuseDate)}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
                  <select
                    value={item.status}
                    disabled={!canEdit}
                    onChange={(event) => updateItem(item.id, { status: event.target.value as AdminExcuseItem["status"] })}
                    className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>

                  <input
                    value={item.adminComment ?? ""}
                    disabled={!canEdit}
                    onChange={(event) => updateItem(item.id, { adminComment: event.target.value })}
                    placeholder="Admin comment"
                    className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none focus:border-[#2CA6A4]"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!canEdit || savingId === item.id}
                    onClick={() => void saveItem(item)}
                    className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
                  >
                    {savingId === item.id ? "Saving..." : "Save Review"}
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      disabled={deletingId === item.id}
                      className="rounded-2xl border border-red-200 px-4 py-3 text-red-600 disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 6h18M8 6V4h8v2M7 6l1 14h8l1-14M10 10v6M14 10v6" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        )})}
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#1F2937]">Profile Picture</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-[24px] bg-[#F8FAFA]">
              <Image
                src={getOptimizedSupabaseImageUrl(previewImage.src, { width: 960, quality: 80, resize: "contain" })}
                alt={previewImage.alt || "Profile picture"}
                width={720}
                height={720}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(confirmDeleteId)}
        title="Delete Excuse?"
        message="This excuse record will be permanently removed."
        tone="danger"
        confirmLabel="Delete Excuse"
        isProcessing={Boolean(confirmDeleteId && deletingId === confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteId ? () => void deleteItem(confirmDeleteId) : undefined}
      />
    </div>
  );
}
