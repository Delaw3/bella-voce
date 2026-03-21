import { createSession, setSessionCookie } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import Waitlist from "@/models/waitlist.model";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  uniqueId?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const uniqueId = payload.uniqueId?.trim().toUpperCase() ?? "";
  const username = payload.username?.trim().toLowerCase() ?? "";
  const password = payload.password?.trim() ?? "";
  const confirmPassword = payload.confirmPassword?.trim() ?? "";

  if (!uniqueId || !username || !password || !confirmPassword) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "Passwords do not match." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const waitlist = await Waitlist.findOne({ uniqueId });
    if (!waitlist) {
      return NextResponse.json(
        { message: "We could not find that unique ID on the Bella Voce waitlist." },
        { status: 404 },
      );
    }

    if (waitlist.signupCompleted) {
      return NextResponse.json(
        { message: "This unique ID has already been used for account creation." },
        { status: 409 },
      );
    }

    const existingUsername = await User.findOne({ username }).lean();
    if (existingUsername) {
      return NextResponse.json({ message: "Username is already taken." }, { status: 409 });
    }

    const existingEmail = await User.findOne({ email: waitlist.email }).lean();
    if (existingEmail) {
      return NextResponse.json(
        { message: "An account already exists for this waitlist email." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await User.create({
      firstName: waitlist.firstName,
      lastName: waitlist.lastName,
      email: waitlist.email,
      uniqueId: waitlist.uniqueId,
      username,
      password: passwordHash,
    });

    waitlist.signupCompleted = true;
    waitlist.status = "REGISTERED";
    await waitlist.save();

    const { token, expiresAt } = await createSession(String(createdUser._id));
    const response = NextResponse.json(
      {
        message: "Account created successfully.",
        nextPath: "/onboarding",
      },
      { status: 201 },
    );

    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { message: "Username, email, or unique ID is already in use." },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Unable to create account right now." }, { status: 500 });
  }
}
