import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentAccount from "@/models/payment-account.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment account id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const account = await PaymentAccount.findOne({ _id: id, isActive: true } as never).lean();

    if (!account) {
      return NextResponse.json({ message: "Payment account not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        account: {
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
