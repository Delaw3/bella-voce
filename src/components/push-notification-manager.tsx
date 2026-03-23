"use client";

import { getClientVapidPublicKey } from "@/lib/push-config";
import { useEffect, useMemo, useState } from "react";

const PUSH_STATUS_EVENT_NAME = "bella-voce-push-status";

function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function broadcastPushStatus(detail: {
  permission: NotificationPermission | "unsupported";
  isBusy: boolean;
  error: string;
  supported: boolean;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PUSH_STATUS_EVENT_NAME, { detail }));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function syncCurrentSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription.toJSON()),
  });
}

export function PushNotificationManager() {
  const publicKey = useMemo(() => getClientVapidPublicKey(), []);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supportsWebPush()) {
      setPermission("unsupported");
      broadcastPushStatus({ permission: "unsupported", isBusy: false, error: "", supported: false });
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    broadcastPushStatus({ permission: currentPermission, isBusy: false, error: "", supported: true });

    if (currentPermission !== "granted" || !publicKey) {
      return;
    }

    void syncCurrentSubscription(publicKey).catch(() => {
      // Keep the app usable even if push registration fails silently.
    });
  }, [publicKey]);

  useEffect(() => {
    const handler = async () => {
      if (!supportsWebPush()) {
        setPermission("unsupported");
        broadcastPushStatus({ permission: "unsupported", isBusy: false, error: "", supported: false });
        return;
      }

      if (!publicKey) {
        setError("Push notifications are not configured yet.");
        broadcastPushStatus({
          permission: Notification.permission,
          isBusy: false,
          error: "Push notifications are not configured yet.",
          supported: true,
        });
        return;
      }

      setIsBusy(true);
      setError("");
      broadcastPushStatus({ permission: Notification.permission, isBusy: true, error: "", supported: true });

      try {
        const nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);

        if (nextPermission === "granted") {
          await syncCurrentSubscription(publicKey);
        }

        broadcastPushStatus({ permission: nextPermission, isBusy: false, error: "", supported: true });
      } catch {
        setError("Unable to enable push notifications right now.");
        broadcastPushStatus({
          permission: Notification.permission,
          isBusy: false,
          error: "Unable to enable push notifications right now.",
          supported: true,
        });
      } finally {
        setIsBusy(false);
      }
    };

    window.addEventListener("bella-voce-enable-push", handler);
    return () => window.removeEventListener("bella-voce-enable-push", handler);
  }, [publicKey]);

  if (permission === "unsupported") {
    return null;
  }

  return (
    <div className="hidden" aria-hidden="true" data-push-permission={permission} data-push-busy={isBusy} data-push-error={error} />
  );
}
