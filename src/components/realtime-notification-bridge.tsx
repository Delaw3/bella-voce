"use client";

import { NotificationItem } from "@/types/dashboard";
import { RealtimeNotificationPayload } from "@/types/realtime";
import { useEffect, useRef } from "react";

type RealtimeNotificationBridgeProps = {
  enabled: boolean;
  onNotification: (payload: RealtimeNotificationPayload) => void;
};

export function RealtimeNotificationBridge({ enabled, onNotification }: RealtimeNotificationBridgeProps) {
  const notificationHandlerRef = useRef(onNotification);

  useEffect(() => {
    notificationHandlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let eventSource: EventSource | null = null;
    let isClosed = false;
    let reconnectTimeoutId: number | null = null;
    let pollIntervalId: number | null = null;
    let visibilityHandler: (() => void) | null = null;
    const knownNotificationIds = new Set<string>();
    let hasSeededFromPolling = false;

    async function syncFromNotificationsApi() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          notifications?: NotificationItem[];
        };

        const notifications = payload.notifications ?? [];

        if (!hasSeededFromPolling) {
          notifications.forEach((item) => {
            knownNotificationIds.add(item.id);
          });
          hasSeededFromPolling = true;
          return;
        }

        const newItems = notifications
          .filter((item) => !knownNotificationIds.has(item.id))
          .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

        newItems.forEach((item) => {
          knownNotificationIds.add(item.id);
          notificationHandlerRef.current(item);
        });
      } catch {
        // Polling is only a fallback path when sockets are unavailable.
      }
    }

    function stopPolling() {
      if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
      }

      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
        visibilityHandler = null;
      }
    }

    function ensurePollingFallback() {
      if (pollIntervalId !== null || isClosed) {
        return;
      }

      void syncFromNotificationsApi();
      pollIntervalId = window.setInterval(() => {
        void syncFromNotificationsApi();
      }, 12000);

      visibilityHandler = () => {
        if (!document.hidden) {
          void syncFromNotificationsApi();
        }
      };

      document.addEventListener("visibilitychange", visibilityHandler);
    }

    function clearReconnectTimeout() {
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
    }

    function scheduleReconnect(delay = 2500) {
      if (isClosed || reconnectTimeoutId !== null) {
        return;
      }

      reconnectTimeoutId = window.setTimeout(() => {
        reconnectTimeoutId = null;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        connect();
      }, delay);
    }

    function connect() {
      try {
        const source = new EventSource("/api/realtime/stream");
        eventSource = source;

        source.addEventListener("ready", () => {
          stopPolling();
          void syncFromNotificationsApi();
        });

        source.addEventListener("notification", (event) => {
          const payload = JSON.parse((event as MessageEvent<string>).data) as RealtimeNotificationPayload;
          knownNotificationIds.add(payload.id);
          notificationHandlerRef.current(payload);
        });

        source.addEventListener("error", () => {
          if (isClosed) {
            return;
          }

          ensurePollingFallback();
          source.close();
          eventSource = null;
          scheduleReconnect();
        });
      } catch {
        ensurePollingFallback();
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      isClosed = true;
      clearReconnectTimeout();
      stopPolling();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [enabled]);

  return null;
}
