"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import {
  formatLagosDateTime,
  type AnonymousMessageItem,
  type AnonymousVoicesScheduleStatus,
  type AnonymousVoicesSettingsDTO,
} from "@/lib/anonymous-voices/client";
import { useCallback, useEffect, useRef, useState } from "react";

type MessagesResponse = {
  messages?: AnonymousMessageItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts?: {
    total: number;
    new: number;
    reviewed: number;
  };
  message?: string;
};

type SettingsResponse = {
  settings?: AnonymousVoicesSettingsDTO;
  status?: {
    isOpen: boolean;
    status: AnonymousVoicesScheduleStatus;
    reason: string;
  };
  message?: string;
};

export function AnonymousVoicesAdmin() {
  const canManage = useCan("anonymous_voices.manage");
  const canDelete = useCan("anonymous_voices.delete");

  // Settings & Schedule State (settings body kept for API sync; only status drives UI)
  const [, setSettings] = useState<AnonymousVoicesSettingsDTO | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<{
    isOpen: boolean;
    status: AnonymousVoicesScheduleStatus;
    reason: string;
  } | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Messages Inbox State
  const [messages, setMessages] = useState<AnonymousMessageItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW" | "REVIEWED">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ total: 0, new: 0, reviewed: 0 });
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Message Actions State
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<AnonymousMessageItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isCapturingShot, setIsCapturingShot] = useState(false);
  const [shotFeedback, setShotFeedback] = useState<string | null>(null);
  const shotCardRef = useRef<HTMLDivElement | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch("/api/admin/anonymous-voices/settings");
      const data = (await response.json()) as SettingsResponse;
      if (response.ok && data.settings && data.status) {
        setSettings(data.settings);
        setScheduleStatus(data.status);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (targetPage = page, status = activeTab) => {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(
          `/api/admin/anonymous-voices?page=${targetPage}&limit=10&status=${status}`,
        );
        const data = (await response.json()) as MessagesResponse;
        if (response.ok) {
          setMessages(data.messages ?? []);
          setPage(data.pagination?.page ?? targetPage);
          setTotalPages(data.pagination?.totalPages ?? 1);
          if (data.counts) {
            setCounts(data.counts);
          }
        } else {
          setFeedback({ tone: "error", text: data.message ?? "Unable to load messages." });
        }
      } catch {
        setFeedback({ tone: "error", text: "Network error while loading messages." });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [page, activeTab],
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadMessages(1, activeTab);
  }, [activeTab, loadMessages]);

  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!selectedMessage) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedMessage(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMessage]);

  useEffect(() => {
    setShotFeedback(null);
    setIsCapturingShot(false);
  }, [selectedMessage?.id]);

  useEffect(() => {
    if (!shotFeedback) return;
    const timeout = window.setTimeout(() => setShotFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [shotFeedback]);

  async function handleScreenshotMessage() {
    if (!selectedMessage || !shotCardRef.current || isCapturingShot) return;
    setIsCapturingShot(true);
    setShotFeedback(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shotCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const fileName = `bella-voce-anonymous-${selectedMessage.id.slice(-6)}.png`;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          const nav = navigator as Navigator & {
            canShare?: (data: { files: File[] }) => boolean;
            share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
          };
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({
              files: [file],
              title: "Bella Voce Anonymous Voice",
              text: "Anonymous message from Bella Voce",
            });
            setShotFeedback("Image shared successfully.");
            return;
          }
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            return;
          }
          // Fall through to download when native share is unavailable or fails.
        }
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShotFeedback("Screenshot saved as PNG.");
    } catch {
      setShotFeedback("Unable to capture screenshot. Please try again.");
    } finally {
      setIsCapturingShot(false);
    }
  }

  async function handleQuickToggle(enabled: boolean) {
    if (!canManage) return;
    setIsSavingSettings(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/anonymous-voices/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          opensAt: null,
          closesAt: null,
        }),
      });

      const data = (await response.json()) as SettingsResponse;
      if (response.ok && data.settings && data.status) {
        setSettings(data.settings);
        setScheduleStatus(data.status);
        setFeedback({
          tone: "success",
          text: enabled
            ? "Submissions opened successfully!"
            : "Submissions closed successfully.",
        });
      } else {
        setFeedback({ tone: "error", text: data.message ?? "Unable to update status." });
      }
    } catch {
      setFeedback({ tone: "error", text: "Network error while updating status." });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleToggleReviewStatus(item: AnonymousMessageItem) {
    if (!canManage) return;
    const nextStatus = item.status === "NEW" ? "REVIEWED" : "NEW";
    setUpdatingId(item.id);
    try {
      const response = await fetch(`/api/admin/anonymous-voices/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        setSelectedMessage((prevSel) => (prevSel && prevSel.id === item.id ? { ...prevSel, status: nextStatus } : prevSel));
      setMessages((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, status: nextStatus } : m)),
        );
        setCounts((prev) => ({
          ...prev,
          new: nextStatus === "REVIEWED" ? Math.max(0, prev.new - 1) : prev.new + 1,
          reviewed: nextStatus === "REVIEWED" ? prev.reviewed + 1 : Math.max(0, prev.reviewed - 1),
        }));
        setFeedback({
          tone: "success",
          text: `Message marked as ${nextStatus.toLowerCase()}.`,
        });
      } else {
        const payload = (await response.json()) as { message?: string };
        setFeedback({ tone: "error", text: payload.message ?? "Failed to update review status." });
      }
    } catch {
      setFeedback({ tone: "error", text: "Network error while updating review status." });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteMessage() {
    if (!confirmDeleteId || !canDelete) return;
    setDeletingId(confirmDeleteId);
    try {
      const response = await fetch(`/api/admin/anonymous-voices/${confirmDeleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const deletedItem = messages.find((m) => m.id === confirmDeleteId);
        setSelectedMessage((prevSel) => (prevSel && prevSel.id === confirmDeleteId ? null : prevSel));
      setMessages((prev) => prev.filter((m) => m.id !== confirmDeleteId));
        if (deletedItem) {
          setCounts((prev) => ({
            total: Math.max(0, prev.total - 1),
            new: deletedItem.status === "NEW" ? Math.max(0, prev.new - 1) : prev.new,
            reviewed: deletedItem.status === "REVIEWED" ? Math.max(0, prev.reviewed - 1) : prev.reviewed,
          }));
        }
        setFeedback({ tone: "success", text: "Anonymous message deleted." });
      } else {
        const payload = (await response.json()) as { message?: string };
        setFeedback({ tone: "error", text: payload.message ?? "Failed to delete message." });
      }
    } catch {
      setFeedback({ tone: "error", text: "Network error while deleting message." });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Anonymous Voices"
        description="Schedule submission windows and review anonymous feedback from choir members."
        badge="Confidential Submissions"
      />

      {/* Feedback Alert */}
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {/* Section 1: Activation & Schedule Management */}
      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_12px_28px_rgba(31,41,55,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl text-[#1F2937]">Submissions</h2>
              {isLoadingSettings ? (
                <span className="text-xs text-slate-500">Loading schedule...</span>
              ) : scheduleStatus?.isOpen ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  OPEN
                </span>
              ) : scheduleStatus?.status === "SCHEDULED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  SCHEDULED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  CLOSED
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tap <span className="font-semibold text-[#1E8C8A]">Open</span> to start receiving messages, or{" "}
              <span className="font-semibold text-[#1E8C8A]">Close</span> to stop.
            </p>
          </div>

          {canManage ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {scheduleStatus?.isOpen ? (
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => void handleQuickToggle(false)}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-70"
                >
                  {isSavingSettings ? "Please wait..." : "Close"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => void handleQuickToggle(true)}
                  className="rounded-xl bg-[#2CA6A4] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E8C8A] disabled:opacity-70"
                >
                  {isSavingSettings ? "Please wait..." : "Open"}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Section 2: Admin Message Inbox */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-[#1F2937]">Submitted Messages</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Genuinely anonymous submissions. Sender identity is never attached or displayed. Click a message to read it.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoadingMessages}
              onClick={() => void loadMessages(page, activeTab)}
              title="Refresh messages"
              aria-label="Refresh messages"
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-[#1E8C8A] disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${isLoadingMessages ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "ALL" ? "bg-[#2CA6A4] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("NEW")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "NEW" ? "bg-[#2CA6A4] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                New ({counts.new})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("REVIEWED")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "REVIEWED"
                    ? "bg-[#2CA6A4] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Reviewed ({counts.reviewed})
              </button>
            </div>
          </div>
        </div>

        {/* Message Cards List */}
        {isLoadingMessages ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#9FD6D5] border-t-[#1E8C8A]" />
              Loading anonymous messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            message={
              activeTab === "ALL"
                ? "No anonymous messages have been submitted yet."
                : `No messages matching the "${activeTab.toLowerCase()}" filter.`
            }
          />
        ) : (
          <div className="space-y-3">
            {messages.map((item) => {
              const isItemUpdating = updatingId === item.id;
              return (
                <article onClick={() => setSelectedMessage(item)}
                  key={item.id}
                  className="cursor-pointer rounded-[24px] border border-[#9FD6D5]/60 bg-white p-5 shadow-[0_8px_20px_rgba(31,41,55,0.04)] transition hover:border-[#2CA6A4] hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                          item.status === "NEW"
                            ? "bg-[#EAF9F8] text-[#1E8C8A] border border-[#9FD6D5]"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                      <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                        Submitted {formatLagosDateTime(item.createdAt)}
                      </time>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {canManage ? (
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={(e) => { e.stopPropagation(); void handleToggleReviewStatus(item); }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            item.status === "NEW"
                              ? "border border-[#9FD6D5] bg-[#EAF9F8] text-[#1E8C8A] hover:bg-[#d6f4f2]"
                              : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isItemUpdating
                            ? "Updating..."
                            : item.status === "NEW"
                              ? "Mark Reviewed"
                              : "Mark as New"}
                        </button>
                      ) : null}

                      {canDelete ? (
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                          aria-label="Delete message"
                          title="Delete message"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="mt-3.5 rounded-2xl bg-[#F8FAFA] p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#1F2937] line-clamp-4">
                      {item.message}
                    </p>
                  </div>
                </article>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <button
                  type="button"
                  disabled={page <= 1 || isLoadingMessages}
                  onClick={() => void loadMessages(page - 1, activeTab)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoadingMessages}
                  onClick={() => void loadMessages(page + 1, activeTab)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Message Detail Modal */}
      {selectedMessage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]"
          onClick={() => setSelectedMessage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Anonymous message details"
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                disabled={isCapturingShot}
                onClick={() => void handleScreenshotMessage()}
                aria-label="Take screenshot"
                title="Screenshot"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#9FD6D5] bg-[#EAF9F8] text-[#1E8C8A] transition hover:bg-[#d8f1f0] active:scale-95 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                aria-label="Close message"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 pr-20">
              <span
                className={
                  selectedMessage.status === "NEW"
                    ? "rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                    : "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                }
              >
                {selectedMessage.status}
              </span>
              <span className="text-[11px] text-slate-400">{formatLagosDateTime(selectedMessage.createdAt)}</span>
            </div>
            <div
              ref={shotCardRef}
              className="bg-white p-1"
            >
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2CA6A4] text-sm font-bold text-white">
                  B
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-[#1F2937]">Bella Voce</p>
                  <p className="text-[11px] text-slate-500">Anonymous Voice</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-[#F8FAFA] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#1F2937]">{selectedMessage.message}</p>
              </div>
            </div>
            {shotFeedback ? (
              <p className="mt-2 text-center text-xs font-medium text-slate-500">{shotFeedback}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <ActionModal
        open={Boolean(confirmDeleteId)}
        title="Delete Anonymous Message?"
        message="Are you sure you want to permanently delete this anonymous message? This action cannot be undone."
        confirmLabel="Delete Message"
        tone="danger"
        isProcessing={Boolean(deletingId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => void handleDeleteMessage()}
      />
    </div>
  );
}
