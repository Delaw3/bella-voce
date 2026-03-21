import { AUTH_COOKIE_NAME, clearSessionCookie } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import Session from "@/models/session.model";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await connectToDatabase();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }

  const response = NextResponse.json({ message: "Logged out." }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
