import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/notification.model";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamNotificationPayload = {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "REMINDER" | "ALERT";
  isRead: boolean;
  createdAt: string;
  route?: string;
};

function serializeNotification(item: {
  _id: { toString(): string };
  title: string;
  message: string;
  type: "INFO" | "REMINDER" | "ALERT";
  isRead: boolean;
  createdAt: Date;
  route?: string;
}): StreamNotificationPayload {
  return {
    id: item._id.toString(),
    title: item.title,
    message: item.message,
    type: item.type,
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
    route: item.route ?? "",
  };
}

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectToDatabase();
  const actorId = new mongoose.Types.ObjectId(user._id.toString());
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let keepAliveId: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  const seenIds = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      const closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        if (keepAliveId) {
          clearInterval(keepAliveId);
          keepAliveId = null;
        }

        try {
          controller.close();
        } catch {
          // Stream may already be closed by the runtime.
        }
      };

      request.signal.addEventListener("abort", closeStream);

      const seedNotifications = await Notification.find()
        .where("userId")
        .equals(actorId)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      seedNotifications.forEach((item) => {
        seenIds.add(item._id.toString());
      });

      send("ready", { ok: true });

      intervalId = setInterval(async () => {
        if (closed) {
          return;
        }

        try {
          const notifications = await Notification.find()
            .where("userId")
            .equals(actorId)
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

          const freshItems = notifications
            .filter((item) => !seenIds.has(item._id.toString()))
            .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

          freshItems.forEach((item) => {
            const payload = serializeNotification(item);
            seenIds.add(payload.id);
            send("notification", payload);
          });
        } catch {
          send("error", { message: "Stream refresh failed." });
        }
      }, 5000);

      keepAliveId = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      }, 15000);
    },
    cancel() {
      closed = true;

      if (intervalId) {
        clearInterval(intervalId);
      }

      if (keepAliveId) {
        clearInterval(keepAliveId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
