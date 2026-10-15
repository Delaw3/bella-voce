import {
  checkAnonymousPublicRateLimit,
  evaluateSubmissionSchedule,
  getOrCreateAnonymousVoicesSettings,
  notifyAdminsOfAnonymousSubmission,
  resolveAnonymousLinkToken,
  validateAnonymousMessage,
} from "@/lib/anonymous-voices";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousMessage from "@/models/anonymous-message.model";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type PublicVoicePayload = {
  message?: unknown;
};

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function POST(request: Request, context: RouteContext) {
  let payload: PublicVoicePayload;
  try {
    payload = (await request.json()) as PublicVoicePayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const validation = validateAnonymousMessage(payload?.message);
  if (!validation.ok) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  try {
    const { token } = await context.params;

    // 1. Token must be the currently active public link
    const record = await resolveAnonymousLinkToken(token);
    if (!record) {
      return NextResponse.json(
        { message: "This link is invalid or has been replaced by the admin." },
        { status: 404 },
      );
    }

    // 2. Same open/close gate as the in-app channel
    const settings = await getOrCreateAnonymousVoicesSettings();
    const schedule = evaluateSubmissionSchedule(settings);
    if (!schedule.isOpen) {
      return NextResponse.json(
        { message: schedule.reason || "Submissions are currently closed." },
        { status: 403 },
      );
    }

    // 3. IP-based cooldown (no login on the public link)
    const rateLimit = await checkAnonymousPublicRateLimit(getClientIp(request));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: `Please wait ${rateLimit.retryAfterSeconds ?? 30} seconds before submitting another anonymous message.`,
        },
        { status: 429 },
      );
    }

    // 4. Persist with ABSOLUTELY NO sender reference or identifier
    await connectToDatabase();
    const created = await AnonymousMessage.create({
      message: validation.message,
      status: "NEW",
    });

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
