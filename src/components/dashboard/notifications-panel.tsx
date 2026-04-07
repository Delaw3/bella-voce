"use client";

import { formatAppDateTime } from "@/lib/utils";
import { NotificationItem } from "@/types/dashboard";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type NotificationsPanelProps = {
  notifications: NotificationItem[];
  onNotificationsChange?: (payload: { notifications: NotificationItem[]; unreadCount: number }) => void;
};

const INITIAL_VISIBLE_COUNT = 10;
const LOAD_MORE_COUNT = 10;

type DeleteResponse = {
  message?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
};

export function NotificationsPanel({ notifications, onNotificationsChange }: NotificationsPanelProps) {
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [permission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  useEffect(() => {
    setItems(notifications);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [notifications]);

  useEffect(() => {
    if (!loadMoreRef.current || visibleCount >= items.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + LOAD_MORE_COUNT, items.length));
        }
      },
      { rootMargin: "80px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  function getTypeClassName(type: NotificationItem["type"]) {
    if (type === "ALERT") {
      return "bg-red-100 text-red-600";
    }

    if (type === "REMINDER") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-[#EAF9F8] text-[#1E8C8A]";
  }

  function syncNotifications(nextItems: NotificationItem[], unreadCount: number) {
    setItems(nextItems);
    onNotificationsChange?.({ notifications: nextItems, unreadCount });

    if (selectedNotification && !nextItems.some((item) => item.id === selectedNotification.id)) {
      setSelectedNotification(null);
    }
  }

  async function deleteNotification(id: string) {
    setError(null);
    setIsDeletingId(id);

    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as DeleteResponse;

      if (!response.ok || !payload.notifications) {
        setError(payload.message ?? "Unable to delete notification.");
        return;
      }

      syncNotifications(payload.notifications, Number(payload.unreadCount ?? 0));
    } catch {
      setError("Unable to delete notification.");
    } finally {
      setIsDeletingId(null);
    }
  }

  async function clearAllNotifications() {
    setError(null);
    setIsClearingAll(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      const payload = (await response.json()) as DeleteResponse;

      if (!response.ok || !payload.notifications) {
        setError(payload.message ?? "Unable to clear notifications.");
        return;
      }

      syncNotifications(payload.notifications, Number(payload.unreadCount ?? 0));
    } catch {
      setError("Unable to clear notifications.");
    } finally {
      setIsClearingAll(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {permission === "default" ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("bella-voce-enable-push"))}
            className="dashboard-push-inline w-full rounded-2xl border border-[#9FD6D5] bg-[#EAF9F8] px-4 py-4 text-left transition hover:bg-[#DDF4F3]"
          >
            <p className="dashboard-push-inline-title text-sm font-semibold text-[#1F2937]">Enable phone notifications</p>
            <p className="dashboard-push-inline-copy mt-1 text-sm text-slate-600">Allow push alerts for replies, dues updates, payments, and song posts.</p>
          </button>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No notifications yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {permission === "default" ? (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("bella-voce-enable-push"))}
          className="dashboard-push-inline w-full rounded-2xl border border-[#9FD6D5] bg-[#EAF9F8] px-4 py-4 text-left transition hover:bg-[#DDF4F3]"
        >
          <p className="dashboard-push-inline-title text-sm font-semibold text-[#1F2937]">Enable phone notifications</p>
          <p className="dashboard-push-inline-copy mt-1 text-sm text-slate-600">Allow push alerts for replies, dues updates, payments, and song posts.</p>
        </button>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#BFE5E1]/60 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#1F2937]">Recent notifications</p>
          <p className="mt-1 text-xs text-slate-500">{items.length} notification{items.length === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => void clearAllNotifications()}
          disabled={isClearingAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
        >
          {isClearingAll ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Clear All
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <ul className="space-y-3">
        {visibleItems.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedNotification(item)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getTypeClassName(item.type)}`}>
                      {item.type}
                    </span>
                    {!item.isRead ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-600">
                        New
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatAppDateTime(item.createdAt)}</p>
              </button>

              <button
                type="button"
                onClick={() => void deleteNotification(item.id)}
                disabled={isDeletingId === item.id}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                aria-label={`Delete ${item.title}`}
              >
                {isDeletingId === item.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {visibleCount < items.length ? <div ref={loadMoreRef} className="h-8 w-full" /> : null}

      {selectedNotification ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTypeClassName(selectedNotification.type)}`}>
                  {selectedNotification.type}
                </span>
                {!selectedNotification.isRead ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                    New
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-xl border border-[#9FD6D5] p-2 text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
                aria-label="Close notification details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="mt-4 text-xl font-semibold text-[#1F2937]">{selectedNotification.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedNotification.message}</p>
            <p className="mt-4 text-xs text-slate-500">{formatAppDateTime(selectedNotification.createdAt)}</p>

            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => void deleteNotification(selectedNotification.id)}
                disabled={isDeletingId === selectedNotification.id}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {isDeletingId === selectedNotification.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
