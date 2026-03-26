import { EMAIL_PATTERN, normalizeEmail } from "@/lib/utils";
import { connectToDatabase } from "@/lib/mongodb";
import PasswordResetOtp from "@/models/password-reset-otp.model";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  email?: string;
  resetToken?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email ?? "");
  const resetToken = (payload.resetToken ?? "").trim();
  const newPassword = (payload.newPassword ?? "").trim();
  const confirmPassword = (payload.confirmPassword ?? "").trim();

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ message: "New password must be at least 8 characters long." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: "Passwords do not match." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const resetRecord = await PasswordResetOtp.findOne({
      email,
      consumedAt: null,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    })
      .sort({ updatedAt: -1 })
      .exec();

    if (!resetRecord || !resetRecord.resetTokenHash) {
      return NextResponse.json({ message: "Your reset session has expired. Please start again." }, { status: 400 });
    }

    const tokenMatches = await bcrypt.compare(resetToken, resetRecord.resetTokenHash);
    if (!tokenMatches) {
      return NextResponse.json({ message: "Your reset session is invalid. Please start again." }, { status: 400 });
    }

    const user = await User.findById(resetRecord.userId).select("_id");
    if (!user) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password: passwordHash,
        },
      } as never,
      { runValidators: false } as never,
    );

    resetRecord.consumedAt = new Date();
    await resetRecord.save();
    await PasswordResetOtp.deleteMany({ email });

    return NextResponse.json({ message: "Password reset successful. Returning to login..." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to reset password right now." }, { status: 500 });
  }
}
