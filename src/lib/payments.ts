import { CACHE_TTL, remember } from "@/lib/cache";
import { MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import {
  PAYMENT_ITEM_CATEGORIES,
  PAYMENT_TRANSACTION_STATUSES,
  PAYMENT_TRANSACTION_TYPES,
} from "@/lib/payment-constants";
import { capitalizeWords } from "@/lib/utils";
import AccountabilitySettings from "@/models/accountability-settings.model";
import AccountabilityAdjustment from "@/models/accountability-adjustment.model";
import Attendance, { normalizeAttendanceState } from "@/models/attendance.model";
import MonthlyDues from "@/models/monthly-dues.model";
import PaymentAccount from "@/models/payment-account.model";
import PaymentTransaction from "@/models/payment-transaction.model";
import User from "@/models/user.model";
import mongoose, { Types } from "mongoose";

export type PaymentTransactionType = (typeof PAYMENT_TRANSACTION_TYPES)[number];
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];
export type PaymentItemCategory = (typeof PAYMENT_ITEM_CATEGORIES)[number];
export type UserIdLike = string | Types.ObjectId;

export type PaymentItemInput = {
  category: PaymentItemCategory;
  description: string;
  amount: number;
  month?: number;
  year?: number;
  accountabilityDate?: Date | string;
  quantity?: number;
};

export type PaymentSummaryItem = {
  id: string;
  transactionType: PaymentTransactionType;
  items: PaymentItemInput[];
  totalAmount: number;
  status: PaymentTransactionStatus;
  transferNote?: string;
  adminNote?: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  account?: {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    isActive: boolean;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  } | null;
};

export type OwedPaymentGroup = {
  category: Exclude<PaymentItemCategory, "CUSTOM">;
  label: string;
  totalAmount: number;
  itemCount: number;
  items: PaymentItemInput[];
};

export type OutstandingPaymentData = {
  owedGroups: OwedPaymentGroup[];
  monthlyDuesYears: number[];
  totalOutstanding: number;
};

type AttendanceFeeItem = {
  id: string;
  date: string;
  amount: number;
};

type AdjustmentItem = {
  id: string;
  reason: string;
  amount: number;
  createdAt: string;
};

function toObjectId(value: UserIdLike) {
  return new mongoose.Types.ObjectId(value.toString());
}

function normalizeItemAmount(value: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

export function computePaymentGrandTotal(items: Array<{ amount: number }>) {
  return Number(items.reduce((total, item) => total + normalizeItemAmount(item.amount), 0).toFixed(2));
}

export function formatPaymentStatus(status: PaymentTransactionStatus) {
  return status.replace("_", " ");
}

export function formatPaymentCategory(category: PaymentItemCategory) {
  if (category === "MONTHLY_DUES") return "Monthly Dues";
  if (category === "LATENESS_FEE") return "Lateness Fee";
  if (category === "ABSENT_FEE") return "Absent Fee";
  if (category === "CUSTOM") return "Custom";
  return capitalizeWords(category.replace("_", " ").toLowerCase());
}

async function ensureSettings() {
  await connectToDatabase();
  return AccountabilitySettings.findOneAndUpdate(
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
}

async function getUserMonthlyDuesConfig(userId: UserIdLike) {
  await connectToDatabase();
  const [settings, user] = await Promise.all([
    ensureSettings(),
    User.findById(toObjectId(userId)).select("monthlyDuesRegistered monthlyDuesStartYear removedMonthlyDuesMonths").lean(),
  ]);

  const settingsStartYear = Number(settings?.monthlyDuesStartYear || new Date().getFullYear());
  const userStartYear = Number(user?.monthlyDuesStartYear || settingsStartYear);
  const startYear = Math.max(settingsStartYear, userStartYear);
  const removedMonths = [...new Set((user?.removedMonthlyDuesMonths ?? []).map((month) => Number(month)).filter((month) => month >= 1 && month <= 12))]
    .sort((left, right) => left - right);

  return {
    isRegistered: Boolean(user?.monthlyDuesRegistered || typeof user?.monthlyDuesStartYear === "number"),
    startYear,
    removedMonths,
  };
}

async function ensureMonthlyDuesForYear(userId: UserIdLike, year: number) {
  await connectToDatabase();
  const objectUserId = toObjectId(userId);
  const { isRegistered, startYear, removedMonths } = await getUserMonthlyDuesConfig(objectUserId);

  if (!isRegistered) {
    return [];
  }

  const allowedMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) => !removedMonths.includes(month));

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

function getMonthName(month: number) {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString("en-GB", { month: "long" });
}

function applyAmountOffset<T extends { amount: number }>(items: T[], approvedAmount: number) {
  let remainingOffset = normalizeItemAmount(approvedAmount);
  const result: T[] = [];

  for (const item of items) {
    const amount = normalizeItemAmount(item.amount);
    if (remainingOffset >= amount) {
      remainingOffset = Number((remainingOffset - amount).toFixed(2));
      continue;
    }

    if (remainingOffset > 0) {
      result.push({ ...item, amount: Number((amount - remainingOffset).toFixed(2)) });
      remainingOffset = 0;
      continue;
    }

    result.push(item);
  }

  return result.filter((item) => normalizeItemAmount(item.amount) > 0);
}

export async function getActivePaymentAccounts() {
  return remember(cacheKeys.activePaymentAccounts(), CACHE_TTL.activePaymentAccounts, async () => {
    await connectToDatabase();
    const accounts = await PaymentAccount.find({ isActive: true } as never).sort({ createdAt: -1 }).lean();

    return accounts.map((account) => ({
      id: account._id.toString(),
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      isActive: Boolean(account.isActive),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));
  });
}

export async function getUserPaymentHistory(userId: UserIdLike) {
  const userKey = userId.toString();

  return remember(cacheKeys.userPaymentHistory(userKey), CACHE_TTL.userPaymentHistory, async () => {
    await connectToDatabase();
    const transactions = await PaymentTransaction.find({ userId: toObjectId(userId) } as never)
      .sort({ submittedAt: -1, createdAt: -1 })
      .populate("selectedAccountId")
      .lean();

    return transactions.map(serializePaymentTransaction);
  });
}

export async function getUserPaymentTransaction(userId: UserIdLike, transactionId: string) {
  const userKey = userId.toString();

  return remember(
    cacheKeys.userPaymentTransaction(userKey, transactionId),
    CACHE_TTL.userPaymentDetails,
    async () => {
      await connectToDatabase();
      const transaction = await PaymentTransaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        userId: toObjectId(userId),
      } as never)
        .populate("selectedAccountId")
        .lean();

      return transaction ? serializePaymentTransaction(transaction) : null;
    },
  );
}

export function serializePaymentTransaction(transaction: any): PaymentSummaryItem {
  const account = transaction.selectedAccountId && typeof transaction.selectedAccountId === "object"
    ? {
        id: transaction.selectedAccountId._id.toString(),
        accountName: transaction.selectedAccountId.accountName,
        accountNumber: transaction.selectedAccountId.accountNumber,
        bankName: transaction.selectedAccountId.bankName,
        isActive: Boolean(transaction.selectedAccountId.isActive),
      }
    : null;

  const user = transaction.userId && typeof transaction.userId === "object" && transaction.userId.firstName
    ? {
        id: transaction.userId._id.toString(),
        firstName: transaction.userId.firstName,
        lastName: transaction.userId.lastName,
        email: transaction.userId.email ?? "",
        profilePicture: transaction.userId.profilePicture ?? "",
      }
    : null;

  return {
    id: transaction._id.toString(),
    transactionType: transaction.transactionType,
    items: (transaction.items ?? []).map((item: any) => ({
      category: item.category,
      description: item.description,
      amount: Number(item.amount || 0),
      month: item.month ? Number(item.month) : undefined,
      year: item.year ? Number(item.year) : undefined,
      accountabilityDate: item.accountabilityDate ? new Date(item.accountabilityDate).toISOString() : undefined,
      quantity: item.quantity ? Number(item.quantity) : undefined,
    })),
    totalAmount: Number(transaction.totalAmount || 0),
    status: transaction.status,
    transferNote: transaction.transferNote ?? "",
    adminNote: transaction.adminNote ?? "",
    submittedAt: new Date(transaction.submittedAt ?? transaction.createdAt).toISOString(),
    approvedAt: transaction.approvedAt ? new Date(transaction.approvedAt).toISOString() : undefined,
    rejectedAt: transaction.rejectedAt ? new Date(transaction.rejectedAt).toISOString() : undefined,
    account,
    user,
  };
}

export async function getApprovedOffsetsForUsers(userIds: UserIdLike[], year: number) {
  await connectToDatabase();
  const objectIds = userIds.map((userId) => toObjectId(userId));
  const transactions = await PaymentTransaction.find({
    userId: { $in: objectIds },
    status: "APPROVED",
  } as never).lean();

  const result = new Map<string, Record<Exclude<PaymentItemCategory, "MONTHLY_DUES" | "CUSTOM">, number>>();

  const empty = () => ({
    LEVY: 0,
    FINE: 0,
    LATENESS_FEE: 0,
    ABSENT_FEE: 0,
    PLEDGE: 0,
  });

  for (const transaction of transactions) {
    const userKey = transaction.userId.toString();
    const current = result.get(userKey) ?? empty();

    for (const item of transaction.items ?? []) {
      if (item.category === "MONTHLY_DUES" || item.category === "CUSTOM") continue;
      if ((item.category === "LATENESS_FEE" || item.category === "ABSENT_FEE") && item.year && Number(item.year) !== year) {
        continue;
      }
      current[item.category] += normalizeItemAmount(Number(item.amount || 0));
    }

    result.set(userKey, current);
  }

  return result;
}

export async function getOutstandingPaymentData(userId: UserIdLike, year = new Date().getFullYear()): Promise<OutstandingPaymentData> {
  const userKey = userId.toString();

  return remember(
    cacheKeys.userOutstandingPayments(userKey, year),
    CACHE_TTL.userOutstandingPayments,
    async () => {
      await connectToDatabase();
      const objectUserId = toObjectId(userId);
      const settings = await ensureSettings();
      const config = await getUserMonthlyDuesConfig(objectUserId);
      const approvedOffsetsMap = await getApprovedOffsetsForUsers([objectUserId], year);
      const approvedOffsets = approvedOffsetsMap.get(objectUserId.toString()) ?? {
        LEVY: 0,
        FINE: 0,
        LATENESS_FEE: 0,
        ABSENT_FEE: 0,
        PLEDGE: 0,
      };

      const monthlyYears = Array.from({ length: Math.max(0, year - config.startYear + 1) }, (_, index) => config.startYear + index);
      const monthlyItems: PaymentItemInput[] = [];

      if (config.isRegistered) {
        for (const duesYear of monthlyYears) {
          const entries = await ensureMonthlyDuesForYear(objectUserId, duesYear);
          for (const entry of entries) {
            if (entry.paid) continue;
            monthlyItems.push({
              category: "MONTHLY_DUES",
              description: `${getMonthName(Number(entry.month))} ${duesYear} Dues`,
              amount: Number(settings?.monthlyDues || 0),
              month: Number(entry.month),
              year: duesYear,
              quantity: 1,
            });
          }
        }
      }

      const adjustmentEntries = await AccountabilityAdjustment.find({ userId: objectUserId } as never)
        .sort({ createdAt: 1, updatedAt: 1 })
        .lean();

      const pledgedItems = applyAmountOffset(
        adjustmentEntries
          .filter((item) => item.type === "PLEDGED")
          .map(
            (item): AdjustmentItem => ({
              id: item._id.toString(),
              reason: item.reason ?? "Pledge",
              amount: Number(item.amount || 0),
              createdAt: item.createdAt.toISOString(),
            }),
          ),
        approvedOffsets.PLEDGE,
      ).map((item) => ({
        category: "PLEDGE" as const,
        description: item.reason,
        amount: item.amount,
        accountabilityDate: item.createdAt,
        quantity: 1,
      }));

      const fineItems = applyAmountOffset(
        adjustmentEntries
          .filter((item) => item.type === "FINE")
          .map(
            (item): AdjustmentItem => ({
              id: item._id.toString(),
              reason: item.reason ?? "Fine",
              amount: Number(item.amount || 0),
              createdAt: item.createdAt.toISOString(),
            }),
          ),
        approvedOffsets.FINE,
      ).map((item) => ({
        category: "FINE" as const,
        description: item.reason,
        amount: item.amount,
        accountabilityDate: item.createdAt,
        quantity: 1,
      }));

      const levyItems = applyAmountOffset(
        adjustmentEntries
          .filter((item) => item.type === "LEVY")
          .map(
            (item): AdjustmentItem => ({
              id: item._id.toString(),
              reason: item.reason ?? "Levy",
              amount: Number(item.amount || 0),
              createdAt: item.createdAt.toISOString(),
            }),
          ),
        approvedOffsets.LEVY,
      ).map((item) => ({
        category: "LEVY" as const,
        description: item.reason,
        amount: item.amount,
        accountabilityDate: item.createdAt,
        quantity: 1,
      }));

      const start = new Date(Date.UTC(year, 0, 1, -1));
      const end = new Date(Date.UTC(year + 1, 0, 1, -1));
      const attendanceEntries = await Attendance.find({ userId: objectUserId, date: { $gte: start, $lt: end } } as never)
        .sort({ date: 1, createdAt: 1 })
        .lean();

      const absentFeeAmount = Number(settings?.absentFee || 0);
      const latenessFeeAmount = Number(settings?.latenessFee || 0);
      const rawAbsentItems: AttendanceFeeItem[] = attendanceEntries
        .filter((item) => normalizeAttendanceState(item).absent)
        .map((item) => ({
          id: item._id.toString(),
          date: item.date.toISOString(),
          amount: absentFeeAmount,
        }));
      const rawLateItems: AttendanceFeeItem[] = attendanceEntries
        .filter((item) => normalizeAttendanceState(item).late)
        .map((item) => ({
          id: item._id.toString(),
          date: item.date.toISOString(),
          amount: latenessFeeAmount,
        }));

      const absentItems = applyAmountOffset(rawAbsentItems, approvedOffsets.ABSENT_FEE).map((item) => ({
        category: "ABSENT_FEE" as const,
        description: `Absent fee for ${new Date(item.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        amount: item.amount,
        accountabilityDate: item.date,
        year,
        quantity: 1,
      }));
      const latenessItems = applyAmountOffset(rawLateItems, approvedOffsets.LATENESS_FEE).map((item) => ({
        category: "LATENESS_FEE" as const,
        description: `Lateness fee for ${new Date(item.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        amount: item.amount,
        accountabilityDate: item.date,
        year,
        quantity: 1,
      }));

      const owedGroups = [
        {
          category: "MONTHLY_DUES" as const,
          label: "Monthly Dues",
          totalAmount: computePaymentGrandTotal(monthlyItems),
          itemCount: monthlyItems.length,
          items: monthlyItems,
        },
        { category: "LEVY" as const, label: "Levy", totalAmount: computePaymentGrandTotal(levyItems), itemCount: levyItems.length, items: levyItems },
        { category: "FINE" as const, label: "Fine", totalAmount: computePaymentGrandTotal(fineItems), itemCount: fineItems.length, items: fineItems },
        {
          category: "LATENESS_FEE" as const,
          label: "Lateness Fee",
          totalAmount: computePaymentGrandTotal(latenessItems),
          itemCount: latenessItems.length,
          items: latenessItems,
        },
        {
          category: "ABSENT_FEE" as const,
          label: "Absent Fee",
          totalAmount: computePaymentGrandTotal(absentItems),
          itemCount: absentItems.length,
          items: absentItems,
        },
        {
          category: "PLEDGE" as const,
          label: "Pledge",
          totalAmount: computePaymentGrandTotal(pledgedItems),
          itemCount: pledgedItems.length,
          items: pledgedItems,
        },
      ].filter((group) => group.items.length > 0) as OwedPaymentGroup[];

      return {
        owedGroups,
        monthlyDuesYears: monthlyYears,
        totalOutstanding: computePaymentGrandTotal(owedGroups.flatMap((group) => group.items)),
      };
    },
  );
}

function normalizeTransactionItems(items: PaymentItemInput[]) {
  return items.map((item) => ({
    category: item.category,
    description: item.description.trim(),
    amount: normalizeItemAmount(item.amount),
    month: item.month ? Number(item.month) : undefined,
    year: item.year ? Number(item.year) : undefined,
    accountabilityDate: item.accountabilityDate ? new Date(item.accountabilityDate) : undefined,
    quantity: item.quantity ? Number(item.quantity) : undefined,
  }));
}

export async function createPaymentTransaction(params: {
  userId: UserIdLike;
  transactionType: PaymentTransactionType;
  items: PaymentItemInput[];
  selectedAccountId?: string;
  transferNote?: string;
}) {
  await connectToDatabase();
  const items = normalizeTransactionItems(params.items).filter((item) => item.description && item.amount > 0);
  const totalAmount = computePaymentGrandTotal(items);

  const payload: Record<string, unknown> = {
    userId: toObjectId(params.userId),
    transactionType: params.transactionType,
    items,
    totalAmount,
    transferNote: params.transferNote?.trim() ?? "",
    submittedAt: new Date(),
  };

  if (params.selectedAccountId && mongoose.isValidObjectId(params.selectedAccountId)) {
    payload.selectedAccountId = new mongoose.Types.ObjectId(params.selectedAccountId);
  }

  const transaction = await PaymentTransaction.create(payload as never);
  const fullTransaction = await PaymentTransaction.findById(transaction._id).populate("selectedAccountId").lean();
  return fullTransaction ? serializePaymentTransaction(fullTransaction) : null;
}

export async function approvePaymentTransaction(params: {
  transactionId: string;
  approvedBy: UserIdLike;
  adminNote?: string;
}) {
  await connectToDatabase();
  if (!mongoose.isValidObjectId(params.transactionId)) {
    throw new Error("Invalid transaction id.");
  }

  const transaction = await PaymentTransaction.findById(params.transactionId).lean();
  if (!transaction) {
    throw new Error("Payment transaction not found.");
  }

  if (transaction.status === "APPROVED") {
    const existing = await PaymentTransaction.findById(transaction._id).populate("selectedAccountId").populate("userId", "firstName lastName email profilePicture").lean();
    return existing ? serializePaymentTransaction(existing) : null;
  }

  if (transaction.status === "REJECTED") {
    throw new Error("Rejected transactions cannot be approved.");
  }

  for (const item of transaction.items ?? []) {
    if (item.category !== "MONTHLY_DUES") continue;
    if (!item.month || !item.year) continue;

    await MonthlyDues.findOneAndUpdate(
      { userId: transaction.userId, year: Number(item.year), month: Number(item.month) } as never,
      {
        $setOnInsert: {
          userId: transaction.userId,
          year: Number(item.year),
          month: Number(item.month),
        },
        $set: {
          paid: true,
          paidAt: new Date(),
        },
      } as never,
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, runValidators: true } as never,
    );
  }

  const updated = await PaymentTransaction.findByIdAndUpdate(
    transaction._id,
    {
      $set: {
        status: "APPROVED",
        adminNote: params.adminNote?.trim() ?? transaction.adminNote ?? "",
        approvedAt: new Date(),
        approvedBy: toObjectId(params.approvedBy),
      },
      $unset: {
        rejectedAt: 1,
        rejectedBy: 1,
      },
    } as never,
    { returnDocument: "after", runValidators: true } as never,
  )
    .populate("selectedAccountId")
    .populate("userId", "firstName lastName email profilePicture")
    .lean();

  return updated ? serializePaymentTransaction(updated) : null;
}

export async function rejectPaymentTransaction(params: {
  transactionId: string;
  rejectedBy: UserIdLike;
  adminNote?: string;
}) {
  await connectToDatabase();
  if (!mongoose.isValidObjectId(params.transactionId)) {
    throw new Error("Invalid transaction id.");
  }

  const transaction = await PaymentTransaction.findById(params.transactionId).lean();
  if (!transaction) {
    throw new Error("Payment transaction not found.");
  }

  if (transaction.status === "APPROVED") {
    throw new Error("Approved transactions cannot be rejected.");
  }

  const updated = await PaymentTransaction.findByIdAndUpdate(
    transaction._id,
    {
      $set: {
        status: "REJECTED",
        adminNote: params.adminNote?.trim() ?? transaction.adminNote ?? "",
        rejectedAt: new Date(),
        rejectedBy: toObjectId(params.rejectedBy),
      },
      $unset: {
        approvedAt: 1,
        approvedBy: 1,
      },
    } as never,
    { returnDocument: "after", runValidators: true } as never,
  )
    .populate("selectedAccountId")
    .populate("userId", "firstName lastName email profilePicture")
    .lean();

  return updated ? serializePaymentTransaction(updated) : null;
}

export async function listAdminPaymentTransactions(params?: {
  page?: number;
  limit?: number;
  status?: PaymentTransactionStatus | "ALL";
  query?: string;
}) {
  const page = Math.max(1, Number(params?.page || 1));
  const limit = Math.min(50, Math.max(1, Number(params?.limit || 10)));
  const status = params?.status && params.status !== "ALL" ? params.status : "ALL";
  const query = params?.query?.trim() ?? "";

  return remember(
    cacheKeys.adminPaymentTransactionsList(page, limit, status, query),
    CACHE_TTL.adminPaymentTransactions,
    async () => {
      await connectToDatabase();
      const filter: Record<string, unknown> = {};

      if (status !== "ALL") {
        filter.status = status;
      }

      let matchingUserIds: Types.ObjectId[] | null = null;
      if (query) {
        const users = await User.find({
          $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        } as never)
          .select("_id")
          .lean();
        matchingUserIds = users.map((user) => new mongoose.Types.ObjectId(user._id.toString()));
        filter.userId = { $in: matchingUserIds.length ? matchingUserIds : [new mongoose.Types.ObjectId()] };
      }

      const total = await PaymentTransaction.countDocuments(filter);
      const transactions = await PaymentTransaction.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("selectedAccountId")
        .populate("userId", "firstName lastName email profilePicture")
        .lean();

      return {
        items: transactions.map(serializePaymentTransaction),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },
  );
}
