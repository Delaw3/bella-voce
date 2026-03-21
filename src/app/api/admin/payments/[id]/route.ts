import { requirePermission } from "@/lib/access-control";
import { invalidateAdminPaymentsCache, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import {
  approvePaymentTransaction,
  rejectPaymentTransaction,
  serializePaymentTransaction,
} from "@/lib/payments";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentTransaction from "@/models/payment-transaction.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  action?: "APPROVE" | "REJECT" | "UPDATE_NOTE";
  adminNote?: string;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("payments.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment transaction id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const transaction = await PaymentTransaction.findById(id)
      .populate("selectedAccountId")
      .populate("userId", "firstName lastName email profilePicture")
      .lean();

    if (!transaction) {
      return NextResponse.json({ message: "Payment transaction not found." }, { status: 404 });
    }

    return NextResponse.json({ transaction: serializePaymentTransaction(transaction) }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment transaction." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment transaction id." }, { status: 400 });
  }

  try {
    if (payload.action === "APPROVE") {
      const permission = await requirePermission("payments.approve");
      if (!permission.ok) {
        return NextResponse.json({ message: permission.message }, { status: permission.status });
      }

      const transaction = await approvePaymentTransaction({
        transactionId: id,
        approvedBy: permission.user._id,
        adminNote: payload.adminNote,
      });

      if (transaction?.user?.id) {
        await Promise.all([
          invalidateUserPaymentCaches(transaction.user.id),
          invalidateAdminPaymentsCache(),
        ]);
      } else {
        await invalidateAdminPaymentsCache();
      }

      return NextResponse.json({ message: "Payment approved successfully.", transaction }, { status: 200 });
    }

    if (payload.action === "REJECT") {
      const permission = await requirePermission("payments.approve");
      if (!permission.ok) {
        return NextResponse.json({ message: permission.message }, { status: permission.status });
      }

      const transaction = await rejectPaymentTransaction({
        transactionId: id,
        rejectedBy: permission.user._id,
        adminNote: payload.adminNote,
      });

      if (transaction?.user?.id) {
        await Promise.all([
          invalidateUserPaymentCaches(transaction.user.id),
          invalidateAdminPaymentsCache(),
        ]);
      } else {
        await invalidateAdminPaymentsCache();
      }

      return NextResponse.json({ message: "Payment rejected successfully.", transaction }, { status: 200 });
    }

    const permission = await requirePermission("payments.edit");
    if (!permission.ok) {
      return NextResponse.json({ message: permission.message }, { status: permission.status });
    }

    await connectToDatabase();
    const updated = await PaymentTransaction.findByIdAndUpdate(
      id,
      { $set: { adminNote: payload.adminNote?.trim() ?? "" } } as never,
      { new: true, runValidators: true } as never,
    )
      .populate("selectedAccountId")
      .populate("userId", "firstName lastName email profilePicture")
      .lean();

    if (!updated) {
      return NextResponse.json({ message: "Payment transaction not found." }, { status: 404 });
    }

    const updatedUserId =
      updated.userId && typeof updated.userId === "object" && "_id" in updated.userId
        ? (updated.userId as { _id: { toString(): string } })._id.toString()
        : null;

    if (updatedUserId) {
      await invalidateUserPaymentCaches(updatedUserId);
    }
    await invalidateAdminPaymentsCache();

    return NextResponse.json(
      {
        message: "Payment note updated successfully.",
        transaction: serializePaymentTransaction(updated),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update payment transaction.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("payments.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment transaction id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await PaymentTransaction.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Payment transaction not found." }, { status: 404 });
    }

    await Promise.all([
      invalidateUserPaymentCaches(deleted.userId.toString()),
      invalidateAdminPaymentsCache(),
    ]);

    return NextResponse.json({ message: "Payment transaction deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete payment transaction." }, { status: 500 });
  }
}
