import {
  evaluateSubmissionSchedule,
  formatLagosDateTime,
  getOrCreateAnonymousVoicesSettings,
  resolveAnonymousLinkToken,
} from "@/lib/anonymous-voices";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

async function loadLinkContext(token: string) {
  const record = await resolveAnonymousLinkToken(token);
  if (!record) {
    return null;
  }
  const settings = await getOrCreateAnonymousVoicesSettings();
  const schedule = evaluateSubmissionSchedule(settings);
  return { record, settings, schedule };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const resolved = await loadLinkContext(token);

    if (!resolved) {
      return NextResponse.json(
        { message: "This link is invalid or has been replaced." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        isOpen: resolved.schedule.isOpen,
        status: resolved.schedule.status,
        opensAt: resolved.settings.opensAt ? resolved.settings.opensAt.toISOString() : null,
        closesAt: resolved.settings.closesAt ? resolved.settings.closesAt.toISOString() : null,
        opensAtFormatted: resolved.settings.opensAt ? formatLagosDateTime(resolved.settings.opensAt) : null,
        closesAtFormatted: resolved.settings.closesAt ? formatLagosDateTime(resolved.settings.closesAt) : null,
        reason: resolved.schedule.reason,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to retrieve submission status right now." }, { status: 500 });
  }
}
