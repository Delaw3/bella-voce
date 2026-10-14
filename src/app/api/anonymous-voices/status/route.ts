import { requireAuthenticatedUser } from "@/lib/auth-api";
import {
  evaluateSubmissionSchedule,
  formatLagosDateTime,
  getOrCreateAnonymousVoicesSettings,
} from "@/lib/anonymous-voices";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const settings = await getOrCreateAnonymousVoicesSettings();
    const schedule = evaluateSubmissionSchedule(settings);

    return NextResponse.json(
      {
        isOpen: schedule.isOpen,
        status: schedule.status,
        opensAt: settings.opensAt ? settings.opensAt.toISOString() : null,
        closesAt: settings.closesAt ? settings.closesAt.toISOString() : null,
        opensAtFormatted: settings.opensAt ? formatLagosDateTime(settings.opensAt) : null,
        closesAtFormatted: settings.closesAt ? formatLagosDateTime(settings.closesAt) : null,
        reason: schedule.reason,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to retrieve submission status right now." },
      { status: 500 },
    );
  }
}
