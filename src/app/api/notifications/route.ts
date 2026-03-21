import { requireAuthenticatedUser } from "@/lib/auth-api";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidateUserNotificationsCache } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import Notification, { NOTIFICATION_TYPES, NotificationType } from "@/models/notification.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    const payload = await remember(cacheKeys.userNotifications(user._id.toString()), CACHE_TTL.userNotifications, async () => {
      const [notifications, unreadCount] = await Promise.all([
        Notification.find().where("userId").equals(actorId).sort({ createdAt: -1 }).lean(),
        Notification.countDocuments().where("userId").equals(actorId).where("isRead").equals(false),
      ]);

      return {
        unreadCount,
        notifications: notifications.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          message: item.message,
          type: item.type,
          isRead: item.isRead,
          createdAt: item.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch notifications right now." }, { status: 500 });
  }
}

type MarkNotificationsReadPayload = {
  types?: NotificationType[];
};

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    let payload: MarkNotificationsReadPayload = {};
    const rawBody = await request.text();

    if (rawBody.trim()) {
      payload = JSON.parse(rawBody) as MarkNotificationsReadPayload;
    }

    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    const requestedTypes = Array.isArray(payload.types)
      ? payload.types.filter((type): type is NotificationType => NOTIFICATION_TYPES.includes(type))
      : ["INFO"];

    await Notification.updateMany(
      { userId: actorId, isRead: false, type: { $in: requestedTypes } } as never,
      { $set: { isRead: true } } as never,
    );
    await invalidateUserNotificationsCache(user._id.toString());

    const unreadCount = await Notification.countDocuments().where("userId").equals(actorId).where("isRead").equals(false);

    return NextResponse.json({ message: "Notifications marked as read.", unreadCount }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update notifications right now." }, { status: 500 });
  }
}
