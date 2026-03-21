import { requirePermission } from "@/lib/access-control";
import { invalidateAdminDashboardCache } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
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
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function parseFinanceDate(input: string): Date | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("choir_finance.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid finance record id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const entry = await ChoirFinance.findById(id)
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")
      .lean();

    if (!entry) {
      return NextResponse.json({ message: "Finance record not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        entry: {
          id: entry._id.toString(),
          type: entry.type,
          amount: Number(entry.amount || 0),
          description: entry.description,
          financeDate: entry.financeDate.toISOString(),
          postedBy: resolveUserName(entry.createdBy),
          editedBy: resolveUserName(entry.updatedBy),
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch finance record." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("choir_finance.edit");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid finance record id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()) as never,
  };

  if (payload.type !== undefined) {
    const type = payload.type.trim().toUpperCase();
    if (!CHOIR_FINANCE_TYPES.includes(type as ChoirFinanceType)) {
      return NextResponse.json({ message: "Invalid finance type." }, { status: 400 });
    }
    updates.type = type;
  }

  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ message: "Amount must be 0 or more." }, { status: 400 });
    }
    updates.amount = amount;
  }

  if (payload.description !== undefined) {
    const description = payload.description.trim();
    if (!description) {
      return NextResponse.json({ message: "Description cannot be empty." }, { status: 400 });
    }
    updates.description = description;
  }

  if (payload.financeDate !== undefined) {
    const financeDate = parseFinanceDate(payload.financeDate.trim());
    if (!financeDate) {
      return NextResponse.json({ message: "Provide a valid finance date." }, { status: 400 });
    }
    updates.financeDate = financeDate;
  }

  try {
    await connectToDatabase();
    const entry = await ChoirFinance.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();

    if (!entry) {
      return NextResponse.json({ message: "Finance record not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Choir finance entry updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update choir finance entry." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("choir_finance.delete");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid finance record id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await ChoirFinance.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Finance record not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Choir finance entry deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete choir finance entry." }, { status: 500 });
  }
}
