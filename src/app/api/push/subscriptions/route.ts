import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { removePushSubscription, savePushSubscription } from "@/lib/push-notifications";
import { NextResponse } from "next/server";

type SubscriptionPayload = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: SubscriptionPayload;
  try {
    payload = (await request.json()) as SubscriptionPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    return NextResponse.json({ message: "Invalid push subscription payload." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await savePushSubscription({
      userId: user._id,
      subscription: {
        endpoint: payload.endpoint,
        expirationTime: payload.expirationTime ?? null,
        keys: {
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        },
      },
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ message: "Push subscription saved." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save push subscription.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: SubscriptionPayload;
  try {
    payload = (await request.json()) as SubscriptionPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const endpoint = payload.endpoint?.trim() ?? "";
  if (!endpoint) {
    return NextResponse.json({ message: "Subscription endpoint is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await removePushSubscription(endpoint);
    return NextResponse.json({ message: "Push subscription removed." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to remove push subscription." }, { status: 500 });
  }
}
