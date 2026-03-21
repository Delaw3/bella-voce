import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

type Payload = {
  username?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const username = payload.username?.trim().toLowerCase() ?? "";

  if (!username) {
    return NextResponse.json({ message: "Username is required." }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json(
      { message: "Username must be at least 3 characters.", available: false },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const existingUser = await User.findOne({ username }).lean();

    return NextResponse.json(
      {
        available: !existingUser,
        message: existingUser ? "Username is already taken." : "Username is available.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to check username right now." }, { status: 500 });
  }
}
