"use client";

import { NotificationItem } from "@/types/dashboard";
import { useEffect, useRef } from "react";

type NotificationPollingSyncPayload = {
  notifications: NotificationItem[];
  unreadCount: number;
  newNotifications: NotificationItem[];
};

type NotificationPollingBridgeProps = {
  enabled: boolean;
  seedNotifications?: NotificationItem[];
  pollIntervalMs?: number;
  onSync: (payload: NotificationPollingSyncPayload) => void;
};

export function NotificationPollingBridge({
  enabled,
  seedNotifications = [],
  pollIntervalMs = 15000,
  onSync,
}: NotificationPollingBridgeProps) {
  const syncHandlerRef = useRef(onSync);
  const knownNotificationIdsRef = useRef(new Set<string>(seedNotifications.map((item) => item.id)));
  const hasCompletedInitialSyncRef = useRef(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    syncHandlerRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (seedNotifications.length === 0 && hasCompletedInitialSyncRef.current) {
      return;
    }

    knownNotificationIdsRef.current = new Set(seedNotifications.map((item) => item.id));
  }, [seedNotifications]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let pollIntervalId: number | null = null;
    let isClosed = false;

    async function syncNotifications() {
      if (isClosed || isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;

      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          notifications?: NotificationItem[];
          unreadCount?: number;
        };

        const notifications = payload.notifications ?? [];
        const unreadCount = Number(payload.unreadCount ?? 0);
        const knownIds = knownNotificationIdsRef.current;

        const newNotifications = hasCompletedInitialSyncRef.current
          ? notifications
              .filter((item) => !knownIds.has(item.id))
              .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
          : [];

        knownNotificationIdsRef.current = new Set(notifications.map((item) => item.id));
        hasCompletedInitialSyncRef.current = true;

        syncHandlerRef.current({
          notifications,
          unreadCount,
          newNotifications,
        });
      } catch {
        // The dashboard still works with the last fetched notification state.
      } finally {
        isSyncingRef.current = false;
      }
    }

    function handleVisibilityRefresh() {
      if (!document.hidden) {
        void syncNotifications();
      }
    }

    function handleFocusRefresh() {
      void syncNotifications();
    }

    void syncNotifications();

    pollIntervalId = window.setInterval(() => {
      void syncNotifications();
    }, pollIntervalMs);

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      isClosed = true;

      if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
      }

      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [enabled, pollIntervalMs]);

  return null;
}
