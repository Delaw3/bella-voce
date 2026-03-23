import { requireAuthenticatedUser } from "@/lib/auth-api";
import { createRealtimeAuthToken } from "@/lib/realtime-auth-store.mjs";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { token, expiresAt } = createRealtimeAuthToken(user._id.toString());

  return NextResponse.json(
    {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    { status: 200 },
  );
}
