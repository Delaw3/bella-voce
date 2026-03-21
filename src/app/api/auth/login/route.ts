import { checkUserDebt } from "@/lib/accountability";
import { createSession, setSessionCookie } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  identifier?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const identifier = payload.identifier?.trim().toLowerCase() ?? "";
  const password = payload.password?.trim() ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Username/email and password are required." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid login credentials." }, { status: 401 });
    }

    if (user.status === "INACTIVE") {
      return NextResponse.json(
        { message: "Account deactivated. Contact admin." },
        { status: 403 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json({ message: "Invalid login credentials." }, { status: 401 });
    }

    await checkUserDebt(String(user._id));

    const { token, expiresAt } = await createSession(String(user._id));
    const response = NextResponse.json(
      {
        message: "Login successful.",
        nextPath: user.onboardingCompleted ? "/dashboard" : "/onboarding",
      },
      { status: 200 },
    );

    setSessionCookie(response, token, expiresAt);
    return response;
  } catch {
    return NextResponse.json({ message: "Unable to login right now." }, { status: 500 });
  }
}
