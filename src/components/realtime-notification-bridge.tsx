"use client";

import { closeRealtimeSocket, getRealtimeSocket } from "@/lib/realtime-client";
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
      closeRealtimeSocket();
      return;
    }

    let isClosed = false;
    let reconnectTimeoutId: number | null = null;
    let unsubscribe = () => {};

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
        unsubscribe();
        closeRealtimeSocket();
        void connect();
      }, delay);
    }

    async function connect() {
      try {
        const response = await fetch("/api/realtime/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          scheduleReconnect();
          return;
        }

        const payload = (await response.json()) as { token?: string };
        if (!payload.token || isClosed) {
          if (!isClosed) {
            scheduleReconnect();
          }
          return;
        }

        const socket = getRealtimeSocket(payload.token);
        const handleNotification = (event: RealtimeNotificationPayload) => {
          notificationHandlerRef.current(event);
        };
        const handleReconnectNeeded = () => {
          scheduleReconnect();
        };

        socket.off("notification:new", handleNotification);
        socket.on("notification:new", handleNotification);
        socket.off("connect_error", handleReconnectNeeded);
        socket.on("connect_error", handleReconnectNeeded);
        socket.off("disconnect", handleReconnectNeeded);
        socket.on("disconnect", handleReconnectNeeded);

        unsubscribe = () => {
          socket.off("notification:new", handleNotification);
          socket.off("connect_error", handleReconnectNeeded);
          socket.off("disconnect", handleReconnectNeeded);
        };
      } catch {
        // Existing polling/fetch flows remain available if the real-time bridge fails.
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      isClosed = true;
      clearReconnectTimeout();
      unsubscribe();
      closeRealtimeSocket();
    };
  }, [enabled]);

  return null;
}
