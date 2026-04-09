import { requireAuthenticatedUser } from "@/lib/auth-api";
import { checkUserRole } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import { formatDisplayName } from "@/lib/utils";
import ChoirFinance, { CHOIR_FINANCE_TYPES, ChoirFinanceType } from "@/models/choir-finance.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  type?: string;
  amount?: number;
  description?: string;
  financeDate?: string;
};

function resolveUserName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const userRecord = user as { firstName?: unknown; lastName?: unknown };

  const firstName = typeof userRecord.firstName === "string" ? userRecord.firstName : "";
  const lastName = typeof userRecord.lastName === "string" ? userRecord.lastName : "";
  return formatDisplayName(firstName, lastName);
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parseMonth(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return fallback;
  return Math.floor(parsed);
}

function buildPeriodLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function parseFinanceDate(input: string): Date | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const page = toPositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
  const year = toPositiveInt(searchParams.get("year"), now.getUTCFullYear());
  const month = parseMonth(searchParams.get("month"), now.getUTCMonth() + 1);
  const skip = (page - 1) * limit;
  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const financeFilter = {
    financeDate: {
      $gte: periodStart,
      $lt: periodEnd,
    },
  };

  try {
    await connectToDatabase();

    const [summaryRows, total, entries] = await Promise.all([
      ChoirFinance.aggregate<{ _id: ChoirFinanceType; totalAmount: number }>([
        { $group: { _id: "$type", totalAmount: { $sum: "$amount" } } },
      ]),
      ChoirFinance.countDocuments(financeFilter),
      ChoirFinance.find()
        .find(financeFilter)
        .populate("createdBy", "firstName lastName")
        .populate("updatedBy", "firstName lastName")
        .sort({ financeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const incomeRow = summaryRows.find((row) => row._id === "INCOME");
    const expenseRow = summaryRows.find((row) => row._id === "EXPENSE");
    const totalIncome = Number(incomeRow?.totalAmount || 0);
    const totalExpenses = Number(expenseRow?.totalAmount || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        summary: {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
        },
        entries: entries.map((entry) => ({
          id: entry._id.toString(),
          type: entry.type,
          amount: Number(entry.amount || 0),
          description: entry.description,
          financeDate: entry.financeDate.toISOString(),
          postedBy: resolveUserName(entry.createdBy),
          editedBy: resolveUserName(entry.updatedBy),
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        period: {
          month,
          year,
          label: buildPeriodLabel(year, month),
          value: `${year}-${String(month).padStart(2, "0")}`,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch choir finance records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await checkUserRole(["SUPER_ADMIN", "ADMIN"]);
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const type = payload.type?.trim().toUpperCase() ?? "";
  const amount = Number(payload.amount);
  const description = payload.description?.trim() ?? "";
  const financeDateRaw = payload.financeDate?.trim() ?? "";
  const financeDate = parseFinanceDate(financeDateRaw);

  if (!type || !description || !financeDateRaw) {
    return NextResponse.json(
      { message: "type, amount, description, and financeDate are required." },
      { status: 400 },
    );
  }

  if (!CHOIR_FINANCE_TYPES.includes(type as ChoirFinanceType)) {
    return NextResponse.json({ message: "Invalid finance type." }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ message: "Amount must be a valid number greater than or equal to 0." }, { status: 400 });
  }

  if (!financeDate) {
    return NextResponse.json({ message: "Please provide a valid finance date." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(permission.user._id.toString());
    const created = await ChoirFinance.create({
      type,
      amount,
      description,
      financeDate,
      createdBy: actorId as never,
    });

    return NextResponse.json(
      {
        message: "Choir finance entry created successfully.",
        entry: {
          id: created._id.toString(),
          type: created.type,
          amount: created.amount,
          description: created.description,
          financeDate: created.financeDate.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to create choir finance entry." }, { status: 500 });
  }
}
