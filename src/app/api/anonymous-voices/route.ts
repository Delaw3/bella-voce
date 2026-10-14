import { hasPermission } from "@/lib/access-control";
import {
  checkAnonymousRateLimit,
  evaluateSubmissionSchedule,
  getOrCreateAnonymousVoicesSettings,
  notifyAdminsOfAnonymousSubmission,
  validateAnonymousMessage,
} from "@/lib/anonymous-voices";
import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousMessage from "@/models/anonymous-message.model";
import { NextResponse } from "next/server";

type AnonymousVoicePayload = {
  message?: unknown;
};

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "Forbidden: only active members may submit messages." },
      { status: 403 },
    );
  }

  if (!hasPermission(user, "anonymous_voices.create")) {
    return NextResponse.json(
      { message: "Forbidden: missing permission to submit anonymous messages." },
      { status: 403 },
    );
  }

  let payload: AnonymousVoicePayload;
  try {
    payload = (await request.json()) as AnonymousVoicePayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const validation = validateAnonymousMessage(payload?.message);
  if (!validation.ok) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  try {
    // 1. Verify schedule status directly on the backend
    const settings = await getOrCreateAnonymousVoicesSettings();
    const schedule = evaluateSubmissionSchedule(settings);

    if (!schedule.isOpen) {
      return NextResponse.json(
        { message: schedule.reason || "Submissions are currently closed." },
        { status: 403 },
      );
    }

    // 2. Enforce transient rate limit per authenticated user
    const rateLimit = await checkAnonymousRateLimit(user._id.toString());
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: `Please wait ${rateLimit.retryAfterSeconds ?? 30} seconds before submitting another anonymous message.`,
        },
        { status: 429 },
      );
    }

    // 3. Persist anonymous message document with ABSOLUTELY NO sender reference or identifier
    await connectToDatabase();
    const created = await AnonymousMessage.create({
      message: validation.message,
      status: "NEW",
    });

    // 4. Trigger non-identifying admin notification in the background
    void notifyAdminsOfAnonymousSubmission(created._id.toString());

    return NextResponse.json(
      { message: "Your anonymous voice has been submitted successfully." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to submit your message right now. Please try again later." },
      { status: 500 },
    );
  }
}
