// Client-side utilities for Anonymous Voices feature.
// This file contains only constants, pure helpers and TypeScript types that can be
// safely imported into client components. It must never import mongoose, mongodb,
// redis or any other server-only dependency.

export const MIN_ANONYMOUS_MESSAGE_LENGTH = 5;
export const MAX_ANONYMOUS_MESSAGE_LENGTH = 2000;
export const SUBMISSION_COOLDOWN_SECONDS = 30;

export const ANONYMOUS_MESSAGE_STATUSES = ["NEW", "REVIEWED"] as const;
export type AnonymousMessageStatus = (typeof ANONYMOUS_MESSAGE_STATUSES)[number];

export type AnonymousVoicesScheduleStatus = "OPEN" | "CLOSED" | "SCHEDULED";

export type AnonymousMessageItem = {
  id: string;
  message: string;
  status: AnonymousMessageStatus;
  createdAt: string;
  updatedAt: string;
};

export type AnonymousVoicesSettingsDTO = {
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  opensAtInput: string;
  closesAtInput: string;
  opensAtFormatted: string | null;
  closesAtFormatted: string | null;
  updatedAt?: string;
};

export type AnonymousVoicesPublicStatus = {
  isOpen: boolean;
  status: AnonymousVoicesScheduleStatus;
  opensAt: string | null;
  closesAt: string | null;
  opensAtFormatted: string | null;
  closesAtFormatted: string | null;
  reason: string;
};

/**
 * Parses a date string representing Lagos local time (WAT / UTC+1) into a UTC Date.
 * Supports standard ISO formats or HTML datetime-local format (YYYY-MM-DDTHH:mm).
 */
export function parseLagosDateTime(input: string | null | undefined): Date | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Already has explicit timezone indicator (Z or +HH:mm or -HH:mm)
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // HTML datetime-local input string without timezone: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  // Append Nigerian standard timezone (+01:00) so Date parses it as Africa/Lagos
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const withTimezone = `${withSeconds}+01:00`;
  const parsed = new Date(withTimezone);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a UTC Date to a readable string in Africa/Lagos local time (WAT).
 */
export function formatLagosDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return `${formatted} WAT`;
}

/**
 * Formats a UTC Date into HTML datetime-local format (YYYY-MM-DDTHH:mm)
 * corresponding to Lagos local time (+01:00).
 */
export function toLagosDateTimeInputString(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  // Lagos is permanently UTC+1 (3600000ms offset)
  const lagosTime = new Date(d.getTime() + 60 * 60 * 1000);
  return lagosTime.toISOString().slice(0, 16);
}

/**
 * Determines whether submissions are currently open based on the settings and current server time.
 */
export function evaluateSubmissionSchedule(
  settings: {
    enabled: boolean;
    opensAt: Date | string | null;
    closesAt: Date | string | null;
  },
  now: Date = new Date(),
): {
  isOpen: boolean;
  status: AnonymousVoicesScheduleStatus;
  reason: string;
} {
  if (!settings.enabled) {
    return {
      isOpen: false,
      status: "CLOSED",
      reason: "Submissions are currently closed. The administration has disabled submissions at this time.",
    };
  }

  const nowMs = now.getTime();
  const opensAt = settings.opensAt ? new Date(settings.opensAt) : null;
  const closesAt = settings.closesAt ? new Date(settings.closesAt) : null;

  if (opensAt && !isNaN(opensAt.getTime()) && nowMs < opensAt.getTime()) {
    const formattedOpen = formatLagosDateTime(opensAt);
    return {
      isOpen: false,
      status: "SCHEDULED",
      reason: `Submissions will open on ${formattedOpen}. Please check back then.`,
    };
  }

  if (closesAt && !isNaN(closesAt.getTime()) && nowMs > closesAt.getTime()) {
    const formattedClose = formatLagosDateTime(closesAt);
    return {
      isOpen: false,
      status: "CLOSED",
      reason: `Submissions closed on ${formattedClose}. Submissions are no longer being accepted for this window.`,
    };
  }

  let reason = "Submissions are currently open. Your thoughts and feedback are welcome.";
  if (closesAt && !isNaN(closesAt.getTime())) {
    reason = `Submissions are open and will close on ${formatLagosDateTime(closesAt)}.`;
  }

  return {
    isOpen: true,
    status: "OPEN",
    reason,
  };
}

