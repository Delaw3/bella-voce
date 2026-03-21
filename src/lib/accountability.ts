import { connectToDatabase } from "@/lib/mongodb";
import { MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { DUE_MONTH_NUMBERS, getMonthLabel } from "@/lib/monthly-dues";
import { getApprovedOffsetsForUsers, getOutstandingPaymentData } from "@/lib/payments";
import AccountabilityAdjustment, {
  AccountabilityAdjustmentType,
} from "@/models/accountability-adjustment.model";
import AccountabilitySettings from "@/models/accountability-settings.model";
import Attendance, { AttendanceStatus, getPrimaryAttendanceStatus, normalizeAttendanceState } from "@/models/attendance.model";
import MonthlyDues from "@/models/monthly-dues.model";
import Notification from "@/models/notification.model";
import UserFinance from "@/models/user-finance.model";
import User from "@/models/user.model";
import mongoose, { Types } from "mongoose";

type UserIdLike = string | Types.ObjectId;
const APP_TIMEZONE_OFFSET_HOURS = 1;

export type AccountabilityBreakdown = {
  monthlyDues: number;
  absentFee: number;
  latenessFee: number;
  pledged: number;
  fine: number;
  levy: number;
  totalOwed: number;
  unpaidMonths: number;
  lateCount: number;
  absentCount: number;
};

export type AccountabilityDetailBreakdown = {
  monthlyDues: MonthlyDueStatusItem[];
  absentFee: Array<{ id: string; date: string; amount: number; status: "ABSENT" }>;
  latenessFee: Array<{ id: string; date: string; amount: number; status: "LATE" }>;
  pledged: Array<{ id: string; date: string; amount: number; reason: string; type: "PLEDGED" }>;
  fine: Array<{ id: string; date: string; amount: number; reason: string; type: "FINE" }>;
  levy: Array<{ id: string; date: string; amount: number; reason: string; type: "LEVY" }>;
};

export type MonthlyDueStatusItem = {
  year: number;
  month: string;
  monthNumber: number;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidAt?: string;
};

export type UserMonthlyDuesConfig = {
  isRegistered: boolean;
  startYear: number;
  removedMonths: number[];
};

export type UserAttendanceItem = {
  id: string;
  date: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
};

const ADJUSTMENT_TYPE_TO_FIELD: Record<AccountabilityAdjustmentType, "pledged" | "fine" | "levy"> = {
  PLEDGED: "pledged",
  FINE: "fine",
  LEVY: "levy",
};

function toObjectId(userId: UserIdLike) {
  return new mongoose.Types.ObjectId(userId.toString());
}

function sanitizeRemovedMonths(months?: number[] | null) {
  return [...new Set((months ?? []).filter((month): month is number => DUE_MONTH_NUMBERS.includes(month as (typeof DUE_MONTH_NUMBERS)[number])))]
    .sort((left, right) => left - right);
}

export function resolveUserMonthlyDuesStartYear(
  settingsStartYear: number,
  userStartYear?: number | null,
) {
  return Math.max(Number(settingsStartYear || new Date().getFullYear()), Number(userStartYear || settingsStartYear || new Date().getFullYear()));
}

export function getAvailableMonthlyDuesYears(startYear: number, currentYear = new Date().getFullYear()) {
  if (startYear > currentYear) {
    return [startYear];
  }

  return Array.from({ length: currentYear - startYear + 1 }, (_, index) => startYear + index);
}

export async function getUserMonthlyDuesConfig(userId: UserIdLike): Promise<UserMonthlyDuesConfig> {
  await connectToDatabase();

  const [settings, user] = await Promise.all([
    ensureAccountabilitySettings(),
    User.findById(toObjectId(userId)).select("monthlyDuesRegistered monthlyDuesStartYear removedMonthlyDuesMonths").lean(),
  ]);

  const globalStartYear = Number(settings?.monthlyDuesStartYear || new Date().getFullYear());
  const isRegistered = Boolean(user?.monthlyDuesRegistered || typeof user?.monthlyDuesStartYear === "number");
  return {
    isRegistered,
    startYear: resolveUserMonthlyDuesStartYear(globalStartYear, user?.monthlyDuesStartYear),
    removedMonths: sanitizeRemovedMonths(user?.removedMonthlyDuesMonths),
  };
}

export function normalizeAttendanceDate(value: Date | string) {
  if (typeof value === "string") {
    const normalizedValue = value.trim();
    const dateOnlyMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, yearValue, monthValue, dayValue] = dateOnlyMatch;
      return new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, Number(dayValue), -APP_TIMEZONE_OFFSET_HOURS));
    }
  }

  const date = new Date(value);
  const shifted = new Date(date.getTime() + APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);

  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), -APP_TIMEZONE_OFFSET_HOURS),
  );
}

export function getAttendanceDateRange(value: Date | string) {
  const start = normalizeAttendanceDate(value);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getYearDateRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1, -APP_TIMEZONE_OFFSET_HOURS)),
    end: new Date(Date.UTC(year + 1, 0, 1, -APP_TIMEZONE_OFFSET_HOURS)),
  };
}

export async function ensureAccountabilitySettings() {
  await connectToDatabase();
  const settings = await AccountabilitySettings.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        monthlyDues: 0,
        latenessFee: 0,
        absentFee: 0,
        monthlyDuesStartYear: MONTHLY_DUES_YEAR_OPTIONS[0],
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean();

  return settings;
}

export async function ensureUserAdjustments(userId: UserIdLike) {
  await connectToDatabase();
  return UserFinance.findOneAndUpdate(
    { userId: toObjectId(userId) } as never,
    {
      $setOnInsert: {
        userId: toObjectId(userId),
        pledged: 0,
        pledgedReason: "",
        fine: 0,
        fineReason: "",
        levy: 0,
        levyReason: "",
      },
    } as never,
    { returnDocument: "after", upsert: true } as never,
  ).lean();
}

export async function migrateLegacyUserAdjustments(userId: UserIdLike) {
  await connectToDatabase();

  const objectUserId = toObjectId(userId);
  const [existingEntries, finance] = await Promise.all([
    AccountabilityAdjustment.countDocuments({ userId: objectUserId } as never),
    ensureUserAdjustments(objectUserId),
  ]);

  if (existingEntries > 0 || !finance) {
    return;
  }

  const legacyEntries = [
    {
      type: "PLEDGED" as const,
      amount: Number(finance.pledged || 0),
      reason: finance.pledgedReason?.trim() ?? "",
    },
    {
      type: "FINE" as const,
      amount: Number(finance.fine || 0),
      reason: finance.fineReason?.trim() ?? "",
    },
    {
      type: "LEVY" as const,
      amount: Number(finance.levy || 0),
      reason: finance.levyReason?.trim() ?? "",
    },
  ].filter((item) => item.amount > 0 || item.reason);

  if (!legacyEntries.length) {
    return;
  }

  await AccountabilityAdjustment.insertMany(
    legacyEntries.map((item) => ({
      userId: objectUserId,
      type: item.type,
      amount: item.amount,
      reason: item.reason || "Legacy adjustment",
      createdAt: finance.updatedAt ?? finance.createdAt,
      updatedAt: finance.updatedAt ?? finance.createdAt,
    })),
  );
}

export async function syncUserAdjustmentTotals(userId: UserIdLike) {
  await connectToDatabase();
  const objectUserId = toObjectId(userId);

  const entries = await AccountabilityAdjustment.find({ userId: objectUserId } as never)
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const totals = {
    pledged: 0,
    fine: 0,
    levy: 0,
    pledgedReason: "",
    fineReason: "",
    levyReason: "",
  };

  for (const entry of entries) {
    const field = ADJUSTMENT_TYPE_TO_FIELD[entry.type];
    totals[field] += Number(entry.amount || 0);

    if (field === "pledged" && !totals.pledgedReason) totals.pledgedReason = entry.reason ?? "";
    if (field === "fine" && !totals.fineReason) totals.fineReason = entry.reason ?? "";
    if (field === "levy" && !totals.levyReason) totals.levyReason = entry.reason ?? "";
  }

  await ensureUserAdjustments(objectUserId);
  return UserFinance.findOneAndUpdate(
    { userId: objectUserId } as never,
    { $set: totals } as never,
    { returnDocument: "after", runValidators: true } as never,
  ).lean();
}

export async function getUserAdjustmentEntries(userId: UserIdLike) {
  await migrateLegacyUserAdjustments(userId);
  await syncUserAdjustmentTotals(userId);

  return AccountabilityAdjustment.find({ userId: toObjectId(userId) } as never)
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

export async function ensureMonthlyDuesForYear(userId: UserIdLike, year: number) {
  await connectToDatabase();
  const objectUserId = toObjectId(userId);
  const { isRegistered, startYear, removedMonths } = await getUserMonthlyDuesConfig(objectUserId);

  if (!isRegistered) {
    return [];
  }

  const allowedMonths = DUE_MONTH_NUMBERS.filter((month) => !removedMonths.includes(month));

  await MonthlyDues.deleteMany({
    userId: objectUserId,
    $or: [{ year: { $lt: startYear } }, { year, month: { $in: removedMonths } }],
  } as never);

  if (year < startYear) {
    return [];
  }

  const existingEntries = await MonthlyDues.find({ userId: objectUserId, year, month: { $in: allowedMonths } } as never).lean();
  const existingMonths = new Set<number>(existingEntries.map((item) => Number(item.month)));
  const missingMonths = allowedMonths.filter((month) => !existingMonths.has(month));

  if (missingMonths.length) {
    await MonthlyDues.insertMany(
      missingMonths.map((month) => ({
        userId: objectUserId,
        year,
        month,
        paid: false,
      })),
      { ordered: false },
    ).catch(() => null);
  }

  return MonthlyDues.find({ userId: objectUserId, year, month: { $in: allowedMonths } } as never).sort({ month: 1 }).lean();
}

export async function getMonthlyDuesStatus(userId: UserIdLike, year: number): Promise<MonthlyDueStatusItem[]> {
  const [settings, config, duesEntries] = await Promise.all([
    ensureAccountabilitySettings(),
    getUserMonthlyDuesConfig(userId),
    ensureMonthlyDuesForYear(userId, year),
  ]);

  if (!config.isRegistered || year < config.startYear) {
    return [];
  }

  const duesMap = new Map(duesEntries.map((entry) => [entry.month, entry]));
  const allowedMonths = DUE_MONTH_NUMBERS.filter((month) => !config.removedMonths.includes(month));

  return allowedMonths.map((month) => {
    const entry = duesMap.get(month);

    return {
      year,
      month: getMonthLabel(month),
      monthNumber: month,
      amount: Number(settings?.monthlyDues || 0),
      status: entry?.paid ? "PAID" : "NOT_PAID",
      paidAt: entry?.paidAt ? new Date(entry.paidAt).toISOString() : undefined,
    };
  });
}

export async function getMonthlyDuesStatusThroughYear(
  userId: UserIdLike,
  year: number,
): Promise<MonthlyDueStatusItem[]> {
  const config = await getUserMonthlyDuesConfig(userId);

  if (!config.isRegistered || year < config.startYear) {
    return [];
  }

  const years = Array.from({ length: year - config.startYear + 1 }, (_, index) => year - index);
  const statuses = await Promise.all(years.map((itemYear) => getMonthlyDuesStatus(userId, itemYear)));

  return statuses.flat();
}

export async function calculateUserAccountability(userId: UserIdLike, year = new Date().getFullYear()) {
  await connectToDatabase();

  const objectUserId = toObjectId(userId);
  const { start, end } = getYearDateRange(year);

  const [settings, attendanceCounts, outstandingPaymentData] = await Promise.all([
    ensureAccountabilitySettings(),
    Attendance.find({ userId: objectUserId, date: { $gte: start, $lt: end } } as never).lean(),
    getOutstandingPaymentData(objectUserId, year),
  ]);

  const monthlyDuesGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "MONTHLY_DUES");
  const absentFeeGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "ABSENT_FEE");
  const latenessFeeGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "LATENESS_FEE");
  const pledgeGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "PLEDGE");
  const fineGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "FINE");
  const levyGroup = outstandingPaymentData.owedGroups.find((group) => group.category === "LEVY");

  const duesStatus =
    monthlyDuesGroup?.items.map((item) => ({
      year: Number(item.year || year),
      month: item.description.replace(/\s+\d{4}\s+Dues$/, ""),
      monthNumber: Number(item.month || 0),
      amount: Number(item.amount || 0),
      status: "NOT_PAID" as const,
      paidAt: undefined,
    })) ?? [];

  const absentFeeDetails =
    absentFeeGroup?.items.map((item, index) => ({
      id: `${item.category}-${index}-${item.accountabilityDate ?? index}`,
      date: String(item.accountabilityDate ?? new Date().toISOString()),
      amount: Number(item.amount || 0),
      status: "ABSENT" as const,
    })) ?? [];
  const latenessFeeDetails =
    latenessFeeGroup?.items.map((item, index) => ({
      id: `${item.category}-${index}-${item.accountabilityDate ?? index}`,
      date: String(item.accountabilityDate ?? new Date().toISOString()),
      amount: Number(item.amount || 0),
      status: "LATE" as const,
    })) ?? [];
  const pledgedDetails =
    pledgeGroup?.items.map((item, index) => ({
      id: `${item.category}-${index}-${item.accountabilityDate ?? index}`,
      date: String(item.accountabilityDate ?? new Date().toISOString()),
      amount: Number(item.amount || 0),
      reason: item.description,
      type: "PLEDGED" as const,
    })) ?? [];
  const fineDetails =
    fineGroup?.items.map((item, index) => ({
      id: `${item.category}-${index}-${item.accountabilityDate ?? index}`,
      date: String(item.accountabilityDate ?? new Date().toISOString()),
      amount: Number(item.amount || 0),
      reason: item.description,
      type: "FINE" as const,
    })) ?? [];
  const levyDetails =
    levyGroup?.items.map((item, index) => ({
      id: `${item.category}-${index}-${item.accountabilityDate ?? index}`,
      date: String(item.accountabilityDate ?? new Date().toISOString()),
      amount: Number(item.amount || 0),
      reason: item.description,
      type: "LEVY" as const,
    })) ?? [];

  const attendanceMap = new Map<AttendanceStatus, number>();
  for (const item of attendanceCounts) {
    const state = normalizeAttendanceState(item);
    if (state.late) {
      attendanceMap.set("LATE", Number(attendanceMap.get("LATE") || 0) + 1);
    }
    if (state.absent) {
      attendanceMap.set("ABSENT", Number(attendanceMap.get("ABSENT") || 0) + 1);
    }
  }
  const unpaidMonths = duesStatus.length;
  const lateCount = Number(attendanceMap.get("LATE") || 0);
  const absentCount = Number(attendanceMap.get("ABSENT") || 0);
  const monthlyDues = Number(monthlyDuesGroup?.totalAmount || 0);
  const latenessFee = Number(latenessFeeGroup?.totalAmount || 0);
  const absentFee = Number(absentFeeGroup?.totalAmount || 0);
  const pledged = Number(pledgeGroup?.totalAmount || 0);
  const fine = Number(fineGroup?.totalAmount || 0);
  const levy = Number(levyGroup?.totalAmount || 0);
  const totalOwed = monthlyDues + latenessFee + absentFee + pledged + fine + levy;

  return {
    breakdown: {
      monthlyDues,
      absentFee,
      latenessFee,
      pledged,
      fine,
      levy,
      totalOwed,
      unpaidMonths,
      lateCount,
      absentCount,
    } satisfies AccountabilityBreakdown,
    settings: {
      monthlyDues: Number(settings?.monthlyDues || 0),
      latenessFee: Number(settings?.latenessFee || 0),
      absentFee: Number(settings?.absentFee || 0),
    },
    duesStatus,
    details: {
      monthlyDues: duesStatus,
      absentFee: absentFeeDetails,
      latenessFee: latenessFeeDetails,
      pledged: pledgedDetails,
      fine: fineDetails,
      levy: levyDetails,
    } satisfies AccountabilityDetailBreakdown,
  };
}

export async function calculateUserDebt(userId: UserIdLike, year = new Date().getFullYear()) {
  return calculateUserAccountability(userId, year);
}

export async function calculateManyUserAccountability(userIds: UserIdLike[], year = new Date().getFullYear()) {
  await connectToDatabase();
  const objectUserIds = userIds.map((userId) => toObjectId(userId));
  const { start, end } = getYearDateRange(year);

  const [settings, adjustments, attendanceCounts, dueEntries] = await Promise.all([
    ensureAccountabilitySettings(),
    UserFinance.find({ userId: { $in: objectUserIds } } as never).lean(),
    Attendance.find({ userId: { $in: objectUserIds }, date: { $gte: start, $lt: end } } as never).lean(),
    MonthlyDues.find({ userId: { $in: objectUserIds }, year } as never).lean(),
  ]);
  const approvedOffsetsMap = await getApprovedOffsetsForUsers(objectUserIds, year);
  const users = await User.find({ _id: { $in: objectUserIds } } as never)
    .select("monthlyDuesRegistered monthlyDuesStartYear removedMonthlyDuesMonths")
    .lean();

  const settingsValues = {
    monthlyDues: Number(settings?.monthlyDues || 0),
    latenessFee: Number(settings?.latenessFee || 0),
    absentFee: Number(settings?.absentFee || 0),
  };
  const settingsStartYear = Number(settings?.monthlyDuesStartYear || new Date().getFullYear());

  const adjustmentsMap = new Map(adjustments.map((item) => [item.userId.toString(), item]));
  const userConfigMap = new Map(
    users.map((user) => [
      user._id.toString(),
      {
        isRegistered: Boolean(user.monthlyDuesRegistered || typeof user.monthlyDuesStartYear === "number"),
        startYear: resolveUserMonthlyDuesStartYear(settingsStartYear, user.monthlyDuesStartYear),
        removedMonths: sanitizeRemovedMonths(user.removedMonthlyDuesMonths),
      },
    ]),
  );
  const attendanceMap = new Map<string, { lateCount: number; absentCount: number }>();
  for (const item of attendanceCounts) {
    const userId = item.userId.toString();
    const current = attendanceMap.get(userId) ?? { lateCount: 0, absentCount: 0 };
    const state = normalizeAttendanceState(item);
    if (state.late) current.lateCount += 1;
    if (state.absent) current.absentCount += 1;

    attendanceMap.set(userId, current);
  }

  const paidCountMap = new Map<string, number>();
  for (const due of dueEntries) {
    const key = due.userId.toString();
    const config = userConfigMap.get(key);
    if (!due.paid || !config || year < config.startYear || config.removedMonths.includes(due.month)) continue;
    paidCountMap.set(key, Number(paidCountMap.get(key) || 0) + 1);
  }

  return new Map(
    objectUserIds.map((userId) => {
      const key = userId.toString();
      const adjustment = adjustmentsMap.get(key);
      const offsets = approvedOffsetsMap.get(key) ?? {
        LEVY: 0,
        FINE: 0,
        LATENESS_FEE: 0,
        ABSENT_FEE: 0,
        PLEDGE: 0,
      };
      const attendance = attendanceMap.get(key) ?? { lateCount: 0, absentCount: 0 };
      const config = userConfigMap.get(key) ?? { isRegistered: false, startYear: settingsStartYear, removedMonths: [] };
      const paidCount = Number(paidCountMap.get(key) || 0);
      const totalMonths =
        !config.isRegistered || year < config.startYear
          ? 0
          : DUE_MONTH_NUMBERS.filter((month) => !config.removedMonths.includes(month)).length;
      const unpaidMonths = Math.max(0, totalMonths - paidCount);
      const monthlyDues = unpaidMonths * settingsValues.monthlyDues;
      const latenessFee = Math.max(0, attendance.lateCount * settingsValues.latenessFee - Number(offsets.LATENESS_FEE || 0));
      const absentFee = Math.max(0, attendance.absentCount * settingsValues.absentFee - Number(offsets.ABSENT_FEE || 0));
      const pledged = Math.max(0, Number(adjustment?.pledged || 0) - Number(offsets.PLEDGE || 0));
      const fine = Math.max(0, Number(adjustment?.fine || 0) - Number(offsets.FINE || 0));
      const levy = Math.max(0, Number(adjustment?.levy || 0) - Number(offsets.LEVY || 0));
      const totalOwed = monthlyDues + latenessFee + absentFee + pledged + fine + levy;

      return [
        key,
        {
          monthlyDues,
          absentFee,
          latenessFee,
          pledged,
          fine,
          levy,
          totalOwed,
          unpaidMonths,
          lateCount: attendance.lateCount,
          absentCount: attendance.absentCount,
        } satisfies AccountabilityBreakdown,
      ];
    }),
  );
}

export async function getUserAttendanceHistory(
  userId: UserIdLike,
  filters?: { month?: number; year?: number },
): Promise<UserAttendanceItem[]> {
  await connectToDatabase();

  const objectUserId = toObjectId(userId);
  const now = new Date();
  const year = filters?.year && filters.year > 0 ? filters.year : now.getFullYear();
  const month = filters?.month && filters.month >= 1 && filters.month <= 12 ? filters.month : undefined;

  const start = month
    ? new Date(Date.UTC(year, month - 1, 1, -APP_TIMEZONE_OFFSET_HOURS))
    : new Date(Date.UTC(year, 0, 1, -APP_TIMEZONE_OFFSET_HOURS));
  const end = month
    ? new Date(Date.UTC(year, month, 1, -APP_TIMEZONE_OFFSET_HOURS))
    : new Date(Date.UTC(year + 1, 0, 1, -APP_TIMEZONE_OFFSET_HOURS));

  const items = await Attendance.find({
    userId: objectUserId,
    date: { $gte: start, $lt: end },
  } as never)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return items.map((item) => ({
    id: item._id.toString(),
    date: item.date.toISOString(),
    status: getPrimaryAttendanceStatus(normalizeAttendanceState(item)) ?? "PRESENT",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function checkUserDebt(userId: UserIdLike, year = new Date().getFullYear()) {
  await connectToDatabase();

  const objectUserId = toObjectId(userId);
  const { breakdown } = await calculateUserDebt(objectUserId, year);

  if (breakdown.unpaidMonths <= 0 || breakdown.totalOwed <= 0) {
    return breakdown;
  }

  await Notification.findOneAndUpdate(
    { userId: objectUserId, type: "REMINDER", title: "Outstanding Dues Reminder" } as never,
    {
      $set: {
        message: `You have unpaid dues for ${breakdown.unpaidMonths} month${breakdown.unpaidMonths === 1 ? "" : "s"}.`,
        isRead: false,
      },
      $setOnInsert: {
        userId: objectUserId,
        title: "Outstanding Dues Reminder",
        type: "REMINDER",
      },
    } as never,
    { upsert: true, returnDocument: "after" } as never,
  );

  await Notification.findOneAndUpdate(
    { userId: objectUserId, type: "REMINDER", title: "Outstanding Balance Reminder" } as never,
    {
      $set: {
        message: `Your total outstanding balance is ₦${breakdown.totalOwed.toLocaleString()}.`,
        isRead: false,
      },
      $setOnInsert: {
        userId: objectUserId,
        title: "Outstanding Balance Reminder",
        type: "REMINDER",
      },
    } as never,
    { upsert: true, returnDocument: "after" } as never,
  );

  return breakdown;
}
