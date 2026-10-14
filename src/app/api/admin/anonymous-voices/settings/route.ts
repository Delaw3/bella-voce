import { requirePermission } from "@/lib/access-control";
import {
  evaluateSubmissionSchedule,
  formatLagosDateTime,
  getOrCreateAnonymousVoicesSettings,
  parseLagosDateTime,
  toLagosDateTimeInputString,
  updateAnonymousVoicesSettingsRecord,
} from "@/lib/anonymous-voices";
import { notifyManyUsers } from "@/lib/push-notifications";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

type SettingsPayload = {
  enabled?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
};

export async function GET() {
  const permission = await requirePermission("anonymous_voices.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const settings = await getOrCreateAnonymousVoicesSettings();
    const schedule = evaluateSubmissionSchedule(settings);

    return NextResponse.json(
      {
        settings: {
          enabled: settings.enabled,
          opensAt: settings.opensAt ? settings.opensAt.toISOString() : null,
          closesAt: settings.closesAt ? settings.closesAt.toISOString() : null,
          opensAtInput: toLagosDateTimeInputString(settings.opensAt),
          closesAtInput: toLagosDateTimeInputString(settings.closesAt),
          opensAtFormatted: settings.opensAt ? formatLagosDateTime(settings.opensAt) : null,
          closesAtFormatted: settings.closesAt ? formatLagosDateTime(settings.closesAt) : null,
          updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
        },
        status: schedule,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to retrieve settings right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handleUpdate(request);
}

export async function PATCH(request: Request) {
  return handleUpdate(request);
}

async function handleUpdate(request: Request) {
  const permission = await requirePermission("anonymous_voices.manage");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: SettingsPayload;
  try {
    payload = (await request.json()) as SettingsPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const enabled = Boolean(payload.enabled);
  const opensAtDate = payload.opensAt ? parseLagosDateTime(payload.opensAt) : null;
  const closesAtDate = payload.closesAt ? parseLagosDateTime(payload.closesAt) : null;

  if (payload.opensAt && !opensAtDate) {
    return NextResponse.json(
      { message: "Invalid opening date and time format." },
      { status: 400 },
    );
  }

  if (payload.closesAt && !closesAtDate) {
    return NextResponse.json(
      { message: "Invalid closing date and time format." },
      { status: 400 },
    );
  }

  if (opensAtDate && closesAtDate && closesAtDate.getTime() <= opensAtDate.getTime()) {
    return NextResponse.json(
      { message: "Closing time must be later than opening time." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateAnonymousVoicesSettingsRecord(
      {
        enabled,
        opensAt: opensAtDate,
        closesAt: closesAtDate,
      },
      permission.user._id.toString(),
    );

    const schedule = evaluateSubmissionSchedule(updated);

    // Notify ALL users whenever submissions are opened or closed.
    // Fire-and-forget so the toggle response is never blocked by notification delivery.
    void (async () => {
      try {
        const recipients = await User.find({ status: "ACTIVE" }).select("_id").lean();
        if (!recipients.length) return;

        const isOpen = schedule.isOpen;
        const timestamp = Date.now();
        await notifyManyUsers(
          recipients.map((recipient) => ({
            userId: recipient._id,
            title: isOpen ? "Anonymous Voices is Open" : "Anonymous Voices is Closed",
            message: isOpen
              ? "Anonymous submissions are now open. Share your thoughts and feedback — it's completely anonymous."
              : "Anonymous submissions are now closed. Thank you to everyone who shared their thoughts.",
            type: "INFO" as const,
            route: "/dashboard/anonymous-voices",
            metadata: {
              itemType: "anonymous_voices_status",
              status: isOpen ? "OPEN" : "CLOSED",
            },
            dedupeKey: `anonymous_voices:${isOpen ? "open" : "closed"}:${timestamp}:${recipient._id.toString()}`,
          })),
        );
      } catch {
        // Non-blocking: toggle already succeeded.
      }
    })();

    return NextResponse.json(
      {
        message: "Anonymous Voices schedule and activation updated successfully.",
        settings: {
          enabled: updated.enabled,
          opensAt: updated.opensAt ? updated.opensAt.toISOString() : null,
          closesAt: updated.closesAt ? updated.closesAt.toISOString() : null,
          opensAtInput: toLagosDateTimeInputString(updated.opensAt),
          closesAtInput: toLagosDateTimeInputString(updated.closesAt),
          opensAtFormatted: updated.opensAt ? formatLagosDateTime(updated.opensAt) : null,
          closesAtFormatted: updated.closesAt ? formatLagosDateTime(updated.closesAt) : null,
          updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
        },
        status: schedule,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to update settings right now." },
      { status: 500 },
    );
  }
}
