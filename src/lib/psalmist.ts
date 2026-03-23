import { formatDisplayName } from "@/lib/utils";

type PsalmistUserShape = {
  _id?: { toString(): string };
  firstName?: string;
  lastName?: string;
  voicePart?: string;
  profilePicture?: string;
};

function isPsalmistUserShape(value: unknown): value is PsalmistUserShape {
  return value !== null && typeof value === "object" && ("firstName" in value || "lastName" in value || "_id" in value);
}

export function normalizePsalmistDateInput(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(normalized.getTime()) ||
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
}

export function getPsalmistMonthKey(value: string | Date) {
  const date = typeof value === "string" ? normalizePsalmistDateInput(value) : value;
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parsePsalmistMonthKey(value?: string | null) {
  const input = value?.trim();

  if (!input) {
    const now = new Date();
    return {
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(input);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) {
    return null;
  }

  return {
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
  };
}

export function formatPsalmistMonthLabel(monthKey: string) {
  const parsed = parsePsalmistMonthKey(monthKey);
  if (!parsed) {
    return monthKey;
  }

  return new Date(Date.UTC(parsed.year, parsed.month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function serializePsalmistItem(item: {
  _id: { toString(): string };
  assignmentDate: Date;
  monthKey: string;
  year: number;
  month: number;
  createdAt: Date;
  updatedAt: Date;
  userId?: PsalmistUserShape | { toString(): string } | null;
}) {
  const user = isPsalmistUserShape(item.userId) ? item.userId : null;

  return {
    id: item._id.toString(),
    assignmentDate: item.assignmentDate.toISOString(),
    monthKey: item.monthKey,
    year: item.year,
    month: item.month,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    user: user
      ? {
          id: user._id?.toString() ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          displayName: formatDisplayName(user.firstName, user.lastName),
          voicePart: user.voicePart ?? "",
          profilePicture: user.profilePicture ?? "",
        }
      : null,
  };
}
