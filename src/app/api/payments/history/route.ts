import { requireAuthenticatedUser } from "@/lib/auth-api";
import { getUserPaymentHistory } from "@/lib/payments";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const items = await getUserPaymentHistory(user._id);
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment history." }, { status: 500 });
  }
}
