import { checkUserRole } from "@/lib/auth-session";
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

function parseFinanceDate(input: string): Date | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await checkUserRole(["SUPER_ADMIN", "ADMIN"]);
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  const financeId = id?.trim() ?? "";

  if (!mongoose.isValidObjectId(financeId)) {
    return NextResponse.json({ message: "Invalid finance record id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const updates: {
    type?: ChoirFinanceType;
    amount?: number;
    description?: string;
    financeDate?: Date;
    updatedBy: mongoose.Types.ObjectId;
  } = {
    updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
  };

  if (payload.type !== undefined) {
    const normalizedType = payload.type.trim().toUpperCase();
    if (!CHOIR_FINANCE_TYPES.includes(normalizedType as ChoirFinanceType)) {
      return NextResponse.json({ message: "Invalid finance type." }, { status: 400 });
    }
    updates.type = normalizedType as ChoirFinanceType;
  }

  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { message: "Amount must be a valid number greater than or equal to 0." },
        { status: 400 },
      );
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
      return NextResponse.json({ message: "Please provide a valid finance date." }, { status: 400 });
    }
    updates.financeDate = financeDate;
  }

  if (Object.keys(updates).length === 1 && updates.updatedBy) {
    return NextResponse.json({ message: "No valid fields provided for update." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const updated = await ChoirFinance.findByIdAndUpdate(financeId, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ message: "Finance record not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Choir finance entry updated successfully.",
        entry: {
          id: updated._id.toString(),
          type: updated.type,
          amount: Number(updated.amount || 0),
          description: updated.description,
          financeDate: updated.financeDate.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update choir finance entry." }, { status: 500 });
  }
}
