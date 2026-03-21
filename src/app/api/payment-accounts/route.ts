import { requireAuthenticatedUser } from "@/lib/auth-api";
import { getActivePaymentAccounts } from "@/lib/payments";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const accounts = await getActivePaymentAccounts();
    return NextResponse.json({ accounts }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment accounts." }, { status: 500 });
  }
}
