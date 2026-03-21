import { requirePermission } from "@/lib/access-control";
import { invalidatePaymentAccountCaches } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentAccount from "@/models/payment-account.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  isActive?: boolean;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("payment_accounts.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment account id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const account = await PaymentAccount.findById(id).lean();

    if (!account) {
      return NextResponse.json({ message: "Payment account not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        item: {
          id: account._id.toString(),
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          isActive: Boolean(account.isActive),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to load payment account." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("payment_accounts.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment account id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const updated = await PaymentAccount.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(payload.accountName !== undefined ? { accountName: payload.accountName.trim() } : {}),
          ...(payload.accountNumber !== undefined ? { accountNumber: payload.accountNumber.trim() } : {}),
          ...(payload.bankName !== undefined ? { bankName: payload.bankName.trim() } : {}),
          ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
          updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
        },
      } as never,
      { new: true, runValidators: true } as never,
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Payment account not found." }, { status: 404 });
    }

    await invalidatePaymentAccountCaches();

    return NextResponse.json(
      {
        message: "Payment account updated successfully.",
        item: {
          id: updated._id.toString(),
          accountName: updated.accountName,
          accountNumber: updated.accountNumber,
          bankName: updated.bankName,
          isActive: Boolean(updated.isActive),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update payment account." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("payment_accounts.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment account id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await PaymentAccount.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Payment account not found." }, { status: 404 });
    }

    await invalidatePaymentAccountCaches();

    return NextResponse.json({ message: "Payment account deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete payment account." }, { status: 500 });
  }
}
