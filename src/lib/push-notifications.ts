import { invalidateAdminDashboardCache, invalidateAdminNotificationsCache, invalidateUserNotificationsCache } from "@/lib/cache-invalidation";
import { getRedisClient } from "@/lib/redis";
import { requireServerPushConfig } from "@/lib/push-config";
import { emitNotificationToUser } from "@/lib/realtime-server.mjs";
import Notification, { NotificationType } from "@/models/notification.model";
import PushSubscriptionModel from "@/models/push-subscription.model";
import mongoose from "mongoose";
import webpush from "web-push";
import { RealtimeNotificationPayload } from "@/types/realtime";

type UserIdLike = string | mongoose.Types.ObjectId;

export type NotificationDeliveryInput = {
  userId: UserIdLike;
  title: string;
  message: string;
  type?: NotificationType;
  route?: string;
  pushTitle?: string;
  pushBody?: string;
  dedupeKey?: string;
  skipPush?: boolean;
};

type PushPayload = {
  title: string;
  body: string;
  route: string;
  icon: string;
  badge: string;
  tag?: string;
};

let vapidConfigured = false;

function toObjectId(value: UserIdLike) {
  return new mongoose.Types.ObjectId(value.toString());
}

function configureWebPush() {
  if (vapidConfigured) {
    return;
  }

  const config = requireServerPushConfig();
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  vapidConfigured = true;
}

function toPushPayload(input: NotificationDeliveryInput): PushPayload {
  return {
    title: input.pushTitle?.trim() || input.title,
    body: input.pushBody?.trim() || input.message,
    route: input.route?.trim() || "/dashboard",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: input.dedupeKey?.trim() || undefined,
  };
}

function toRealtimePayload(created: {
  _id: { toString(): string };
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  route?: string;
}): RealtimeNotificationPayload {
  return {
    id: created._id.toString(),
    title: created.title,
    message: created.message,
    type: created.type,
    isRead: created.isRead,
    createdAt: created.createdAt.toISOString(),
    route: created.route ?? "",
    metadata: {
      source: "notification-service",
    },
  };
}

async function shouldSendPushDedupe(key?: string) {
  const dedupeKey = key?.trim();
  if (!dedupeKey) {
    return true;
  }

  const redis = getRedisClient();
  if (!redis) {
    return true;
  }

  try {
    const result = await redis.set(`push:dedupe:${dedupeKey}`, "1", { nx: true, ex: 120 });
    return result === "OK";
  } catch {
    return true;
  }
}

export async function savePushSubscription(params: {
  userId: UserIdLike;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
  userAgent?: string;
}) {
  const endpoint = params.subscription.endpoint.trim();
  if (!endpoint || !params.subscription.keys?.p256dh || !params.subscription.keys?.auth) {
    throw new Error("Invalid push subscription payload.");
  }

  const saved = await PushSubscriptionModel.findOneAndUpdate(
    { endpoint } as never,
    {
      $set: {
        userId: toObjectId(params.userId),
        endpoint,
        expirationTime: params.subscription.expirationTime ?? null,
        keys: {
          p256dh: params.subscription.keys.p256dh,
          auth: params.subscription.keys.auth,
        },
        userAgent: params.userAgent?.trim() ?? "",
      },
    } as never,
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true } as never,
  ).lean();

  return saved;
}

export async function removePushSubscription(endpoint: string) {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) {
    return;
  }

  await PushSubscriptionModel.deleteOne({ endpoint: normalizedEndpoint } as never);
}

async function sendPushToUser(userId: UserIdLike, payload: PushPayload) {
  const config = requireServerPushConfig();
  if (!config.isConfigured) {
    return { sent: 0, removed: 0 };
  }

  configureWebPush();

  const subscriptions = await PushSubscriptionModel.find({ userId: toObjectId(userId) } as never).lean();
  if (!subscriptions.length) {
    return { sent: 0, removed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
          },
          JSON.stringify(payload),
        );
        return { removed: false };
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ endpoint: subscription.endpoint } as never);
          return { removed: true };
        }

        return { removed: false };
      }
    }),
  );

  let sent = 0;
  let removed = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.removed) {
        removed += 1;
      } else {
        sent += 1;
      }
    }
  }

  return { sent, removed };
}

export async function createNotificationRecord(input: NotificationDeliveryInput) {
  const created = await Notification.create({
    userId: toObjectId(input.userId),
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type ?? "INFO",
    route: input.route?.trim() ?? "",
    isRead: false,
  } as never);

  await Promise.all([
    invalidateUserNotificationsCache(input.userId.toString()),
    invalidateAdminNotificationsCache(),
    invalidateAdminDashboardCache(),
  ]);

  return created;
}

export async function notifyUser(input: NotificationDeliveryInput) {
  const created = await createNotificationRecord(input);
  emitNotificationToUser(input.userId.toString(), toRealtimePayload(created));

  if (input.skipPush) {
    return created;
  }

  const shouldPush = await shouldSendPushDedupe(input.dedupeKey);
  if (!shouldPush) {
    return created;
  }

  try {
    await sendPushToUser(input.userId, toPushPayload(input));
  } catch {
    // Notification persistence must remain the source of truth even if push delivery fails.
  }

  return created;
}

export async function notifyManyUsers(inputs: NotificationDeliveryInput[]) {
  const created = await Notification.insertMany(
    inputs.map((input) => ({
      userId: toObjectId(input.userId),
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type ?? "INFO",
      route: input.route?.trim() ?? "",
      isRead: false,
    })),
  );

  const userIds = [...new Set(inputs.map((item) => item.userId.toString()))];
  await Promise.all([
    invalidateAdminNotificationsCache(),
    invalidateAdminDashboardCache(),
    ...userIds.map((userId) => invalidateUserNotificationsCache(userId)),
  ]);

  created.forEach((item) => {
    emitNotificationToUser(item.userId.toString(), toRealtimePayload(item));
  });

  await Promise.allSettled(
    inputs.map(async (input) => {
      if (input.skipPush) {
        return;
      }

      const shouldPush = await shouldSendPushDedupe(input.dedupeKey);
      if (!shouldPush) {
        return;
      }

      try {
        await sendPushToUser(input.userId, toPushPayload(input));
      } catch {
        // Keep business actions successful even when push delivery fails.
      }
    }),
  );

  return created;
}
