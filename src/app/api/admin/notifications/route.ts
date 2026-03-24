import { requirePermission } from "@/lib/access-control";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidateAdminDashboardCache, invalidateAdminNotificationsCache, invalidateUserNotificationsCache } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import { notifyManyUsers } from "@/lib/push-notifications";
import { USER_ROLES, UserRole } from "@/lib/user-config";
import { connectToDatabase } from "@/lib/mongodb";
import Notification, { NOTIFICATION_TYPES, NotificationType } from "@/models/notification.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  scope?: "USER" | "ALL" | "ROLE";
  userId?: string;
  role?: UserRole;
  title?: string;
  message?: string;
  type?: NotificationType;
  route?: string;
};

export async function GET() {
  const permission = await requirePermission("notifications.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const payload = await remember(cacheKeys.adminNotificationsList(), CACHE_TTL.adminNotificationsList, async () => {
      await connectToDatabase();
      const notifications = await Notification.find()
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return {
        notifications: notifications.map((item) => {
          const recipient = item.userId as
            | {
                _id?: { toString(): string };
                firstName?: string;
                lastName?: string;
                email?: string;
              }
            | null;

          return {
            id: item._id.toString(),
            userId: recipient?._id?.toString() ?? "",
            title: item.title,
            message: item.message,
            type: item.type,
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            route: item.route ?? "",
            metadata: item.metadata ?? undefined,
            user: recipient
              ? {
                  id: recipient._id?.toString() ?? "",
                  firstName: recipient.firstName ?? "",
                  lastName: recipient.lastName ?? "",
                  email: recipient.email ?? "",
                }
              : null,
          };
        }),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch notifications." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("notifications.create");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const scope = payload.scope ?? "ALL";
  const title = payload.title?.trim() ?? "";
  const message = payload.message?.trim() ?? "";
  const route = payload.route?.trim() ?? "/dashboard";
  const type = payload.type?.trim().toUpperCase() as NotificationType | undefined;

  if (!title || !message || !type || !NOTIFICATION_TYPES.includes(type)) {
    return NextResponse.json({ message: "Provide a valid title, message, and notification type." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    let recipients: Array<{ _id: mongoose.Types.ObjectId }> = [];

    if (scope === "USER") {
      const userId = payload.userId?.trim() ?? "";
      if (!mongoose.isValidObjectId(userId)) {
        return NextResponse.json({ message: "Provide a valid user for a single-user notification." }, { status: 400 });
      }

      const user = await User.findById(userId).select("_id").lean();
      recipients = user ? [{ _id: user._id }] : [];
    } else if (scope === "ROLE") {
      const role = payload.role?.trim().toUpperCase() as UserRole | undefined;
      if (!role || !USER_ROLES.includes(role)) {
        return NextResponse.json({ message: "Provide a valid role target." }, { status: 400 });
      }
      recipients = await User.find({ role }).select("_id").lean();
    } else {
      recipients = await User.find().select("_id").lean();
    }

    if (!recipients.length) {
      return NextResponse.json({ message: "No recipients found for this notification." }, { status: 404 });
    }

    await notifyManyUsers(
      recipients.map((recipient) => ({
        userId: recipient._id,
        title,
        message,
        type,
        route,
        dedupeKey: `admin-broadcast:${type}:${route}:${title}:${message}:${recipient._id.toString()}`,
      })),
    );

    return NextResponse.json(
      {
        message: `Notification sent successfully to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to send notification right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const permission = await requirePermission("notifications.delete");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid notification id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Notification.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }

    await Promise.all([
      invalidateAdminNotificationsCache(),
      invalidateAdminDashboardCache(),
      invalidateUserNotificationsCache(deleted.userId.toString()),
    ]);

    return NextResponse.json({ message: "Notification deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete notification." }, { status: 500 });
  }
}
