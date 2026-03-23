"use client";

import { NotificationItem } from "@/types/dashboard";
import { formatAppDateTime } from "@/lib/utils";
import { useState } from "react";

type NotificationsPanelProps = {
  notifications: NotificationItem[];
};

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [permission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  function getTypeClassName(type: NotificationItem["type"]) {
    if (type === "ALERT") {
      return "bg-red-100 text-red-600";
    }

    if (type === "REMINDER") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-[#EAF9F8] text-[#1E8C8A]";
  }

  if (notifications.length === 0) {
    return (
      <div className="space-y-3">
        {permission === "default" ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("bella-voce-enable-push"))}
            className="w-full rounded-2xl border border-[#9FD6D5] bg-[#EAF9F8] px-4 py-4 text-left transition hover:bg-[#DDF4F3]"
          >
            <p className="text-sm font-semibold text-[#1F2937]">Enable phone notifications</p>
            <p className="mt-1 text-sm text-slate-600">Allow push alerts for replies, dues updates, payments, and song posts.</p>
          </button>
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
          className="w-full rounded-2xl border border-[#9FD6D5] bg-[#EAF9F8] px-4 py-4 text-left transition hover:bg-[#DDF4F3]"
        >
          <p className="text-sm font-semibold text-[#1F2937]">Enable phone notifications</p>
          <p className="mt-1 text-sm text-slate-600">Allow push alerts for replies, dues updates, payments, and song posts.</p>
        </button>
      ) : null}
      <ul className="space-y-3">
        {notifications.map((item) => {
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedNotification(item)}
                className="block w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
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
            </li>
          );
        })}
      </ul>

      {selectedNotification ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTypeClassName(selectedNotification.type)}`}
                >
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
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <h3 className="mt-4 text-xl font-semibold text-[#1F2937]">{selectedNotification.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedNotification.message}</p>
            <p className="mt-4 text-xs text-slate-500">{formatAppDateTime(selectedNotification.createdAt)}</p>

            <div className="mt-5 flex justify-end">
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
