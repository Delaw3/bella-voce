import { requirePermission } from "@/lib/access-control";
import { invalidateAdminDashboardCache } from "@/lib/cache-invalidation";
import {
  DEFAULT_COMPLAINT_LIMIT,
  DEFAULT_COMPLAINT_PAGE,
  MAX_COMPLAINT_LIMIT,
  toPositiveInt,
} from "@/lib/complaints";
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

function parseFinanceDate(input: string): Date | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: Request) {
  const permission = await requirePermission("choir_finance.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const page = toPositiveInt(searchParams.get("page"), DEFAULT_COMPLAINT_PAGE);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), DEFAULT_COMPLAINT_LIMIT), MAX_COMPLAINT_LIMIT);
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();

    const [summaryRows, total, entries] = await Promise.all([
      ChoirFinance.aggregate<{ _id: ChoirFinanceType; totalAmount: number }>([
        { $group: { _id: "$type", totalAmount: { $sum: "$amount" } } },
      ]),
      ChoirFinance.countDocuments(),
      ChoirFinance.find()
        .populate("createdBy", "firstName lastName")
        .populate("updatedBy", "firstName lastName")
        .sort({ financeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const incomeRow = summaryRows.find((row) => row._id === "INCOME");
    const expenseRow = summaryRows.find((row) => row._id === "EXPENSE");

    return NextResponse.json(
      {
        summary: {
          totalIncome: Number(incomeRow?.totalAmount || 0),
          totalExpenses: Number(expenseRow?.totalAmount || 0),
          balance: Number(incomeRow?.totalAmount || 0) - Number(expenseRow?.totalAmount || 0),
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
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch choir finance entries." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("choir_finance.create");
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
  const financeDate = parseFinanceDate(payload.financeDate?.trim() ?? "");

  if (
    !CHOIR_FINANCE_TYPES.includes(type as ChoirFinanceType) ||
    !description ||
    !financeDate ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return NextResponse.json({ message: "Provide valid choir finance details." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(permission.user._id.toString());
    const entry = await ChoirFinance.create({
      type,
      amount,
      description,
      financeDate,
      createdBy: actorId as never,
    });

    await invalidateAdminDashboardCache();

    return NextResponse.json(
      {
        message: "Choir finance entry created successfully.",
        entry: {
          id: entry._id.toString(),
          type: entry.type,
          amount: entry.amount,
          description: entry.description,
          financeDate: entry.financeDate.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to create choir finance entry." }, { status: 500 });
  }
}
