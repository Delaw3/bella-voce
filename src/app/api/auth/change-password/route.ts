import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const oldPassword = payload.oldPassword?.trim() ?? "";
  const newPassword = payload.newPassword?.trim() ?? "";
  const confirmPassword = payload.confirmPassword?.trim() ?? "";

  if (!oldPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ message: "All password fields are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: "New passwords do not match." }, { status: 400 });
  }

  if (oldPassword === newPassword) {
    return NextResponse.json(
      { message: "New password must be different from old password." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const user = await User.findById(authUser._id);

    if (!user) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    const oldPasswordMatches = await bcrypt.compare(oldPassword, user.password);
    if (!oldPasswordMatches) {
      return NextResponse.json({ message: "Old password is incorrect." }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Password changed successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to change password right now." }, { status: 500 });
  }
}
