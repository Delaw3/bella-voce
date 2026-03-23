import { NotificationItem } from "@/types/dashboard";

export type RealtimeNotificationPayload = NotificationItem & {
  metadata?: {
    source?: string;
  };
};
