import { requireAuthenticatedUser } from "@/lib/auth-api";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  password?: string;
};

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden: insufficient permissions." }, { status: 403 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const password = payload.password?.trim() ?? "";

  if (!password) {
    return NextResponse.json({ message: "Password is required." }, { status: 400 });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({ message: "Admin access confirmed successfully." }, { status: 200 });
}
