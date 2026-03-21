import { requireAuthenticatedUser } from "@/lib/auth-api";
import { getUserPaymentTransaction } from "@/lib/payments";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid payment transaction id." }, { status: 400 });
  }

  try {
    const transaction = await getUserPaymentTransaction(user._id, id);
    if (!transaction) {
      return NextResponse.json({ message: "Payment transaction not found." }, { status: 404 });
    }

    return NextResponse.json({ transaction }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment transaction." }, { status: 500 });
  }
}
