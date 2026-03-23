"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import { formatAppDate, formatAppTime, formatDisplayName, formatInitials } from "@/lib/utils";
import { AdminComplaintItem } from "@/types/admin";
import Image from "next/image";
import { useEffect, useState } from "react";

type ComplaintsPayload = {
  complaints?: AdminComplaintItem[];
  pagination?: { page: number; totalPages: number };
  message?: string;
};

export function ComplaintsAdmin() {
  const canEdit = useCan("complaints.edit");
  const canDelete = useCan("complaints.delete");
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function loadComplaints(nextPage = page) {
    setIsLoading(true);
    const response = await fetch(`/api/admin/complaints?page=${nextPage}&limit=10`);
    const payload = (await response.json()) as ComplaintsPayload;
    if (response.ok) {
      setComplaints(payload.complaints ?? []);
      setPage(payload.pagination?.page ?? 1);
      setTotalPages(payload.pagination?.totalPages ?? 1);
    } else {
      setFeedback(payload.message ?? "Unable to load complaints.");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/complaints?page=1&limit=10");
      const payload = (await response.json()) as ComplaintsPayload;

      if (cancelled) return;

      if (response.ok) {
        setComplaints(payload.complaints ?? []);
        setPage(payload.pagination?.page ?? 1);
        setTotalPages(payload.pagination?.totalPages ?? 1);
      } else {
        setFeedback(payload.message ?? "Unable to load complaints.");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateComplaint(id: string, patch: Partial<AdminComplaintItem>) {
    setComplaints((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function saveComplaint(item: AdminComplaintItem) {
    setSavingId(item.id);
    const response = await fetch(`/api/admin/complaints/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status, adminNote: item.adminNote ?? "" }),
    });
    const payload = (await response.json()) as { message?: string };
    setFeedback(payload.message ?? null);
    if (response.ok) void loadComplaints(page);
    setSavingId(null);
  }

  async function deleteComplaint(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/admin/complaints/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    setFeedback(payload.message ?? null);
    if (response.ok) void loadComplaints(page);
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Complaints"
        description="Review submitted complaints, track their status, and keep internal admin notes alongside each report."
        badge="Operational Admin"
      />

      {feedback ? (
        <p className="rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm text-[#1E8C8A]">{feedback}</p>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-600">Loading complaints...</p> : null}
      {!isLoading && complaints.length === 0 ? <EmptyState message="No complaints available." /> : null}

      <div className="grid gap-3">
        {complaints.map((item) => {
          const isExpanded = expandedIds.includes(item.id);

          return (
          <article key={item.id} className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  item.sender?.profilePicture
                    ? setPreviewImage({
                        src: item.sender.profilePicture,
                        alt: formatDisplayName(item.sender.firstName, item.sender.lastName),
                      })
                    : undefined
                }
                className="rounded-full transition hover:opacity-90"
              >
                <ProfileAvatar
                  src={item.sender?.profilePicture}
                  alt={item.sender ? formatDisplayName(item.sender.firstName, item.sender.lastName) : "Unknown sender"}
                  initials={item.sender ? formatInitials(item.sender.firstName, item.sender.lastName) : "?"}
                  size={48}
                  className="h-12 w-12 ring-2 ring-[#9FD6D5]/70"
                  fallbackClassName="bg-[#9FD6D5]/35 text-[#1E8C8A]"
                />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">
                  {item.sender ? formatDisplayName(item.sender.firstName, item.sender.lastName) : "Unknown sender"}
                </p>
                <p className="text-xs text-slate-500">{formatAppDate(item.createdAt)}</p>
                <p className="text-[11px] text-slate-400">Posted {formatAppTime(item.createdAt)}</p>
              </div>
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
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.message}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
                  <select
                    value={item.status}
                    disabled={!canEdit}
                    onChange={(event) => updateComplaint(item.id, { status: event.target.value as AdminComplaintItem["status"] })}
                    className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-3 py-3 text-sm outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="READ">READ</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                  <input
                    value={item.adminNote ?? ""}
                    disabled={!canEdit}
                    onChange={(event) => updateComplaint(item.id, { adminNote: event.target.value })}
                    placeholder="Admin note"
                    className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!canEdit || savingId === item.id}
                    onClick={() => void saveComplaint(item)}
                    className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
                  >
                    {savingId === item.id ? "Saving..." : "Save Complaint Update"}
                  </button>
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
              </>
            ) : null}
          </article>
        );
        })}
      </div>

      <div className="flex items-center justify-between rounded-[24px] border border-[#9FD6D5]/70 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => void loadComplaints(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
        >
          Previous
        </button>
        <p className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          onClick={() => void loadComplaints(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/70 px-4 py-8">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-[#F8FAFA] hover:text-[#1F2937]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <Image
              src={getOptimizedSupabaseImageUrl(previewImage.src, { width: 960, quality: 80, resize: "contain" })}
              alt={previewImage.alt}
              width={720}
              height={720}
              className="mt-2 h-auto max-h-[70vh] w-full rounded-[24px] object-cover"
            />
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(confirmDeleteId)}
        title="Delete Complaint?"
        message="This complaint will be permanently removed from the admin records."
        tone="danger"
        confirmLabel="Delete Complaint"
        isProcessing={Boolean(confirmDeleteId && deletingId === confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDeleteId ? () => void deleteComplaint(confirmDeleteId) : undefined}
      />
    </div>
  );
}
