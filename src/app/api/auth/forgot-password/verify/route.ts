import { EMAIL_PATTERN, normalizeEmail } from "@/lib/utils";
import { connectToDatabase } from "@/lib/mongodb";
import PasswordResetOtp from "@/models/password-reset-otp.model";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

type Payload = {
  email?: string;
  otp?: string;
};

const MAX_RESET_ATTEMPTS = 5;
const RESET_WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email ?? "");
  const otp = (payload.otp ?? "").trim();

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ message: "Enter the 6-digit OTP sent to your email." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const resetRecord = await PasswordResetOtp.findOne({
      email,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!resetRecord) {
      return NextResponse.json({ message: "This OTP has expired. Please request a new one." }, { status: 400 });
    }

    if (resetRecord.attempts >= MAX_RESET_ATTEMPTS) {
      return NextResponse.json({ message: "Too many incorrect OTP attempts. Request a new code." }, { status: 429 });
    }

    const otpMatches = await bcrypt.compare(otp, resetRecord.otpHash);

    if (!otpMatches) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      return NextResponse.json({ message: "The OTP you entered is incorrect." }, { status: 400 });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    resetRecord.resetTokenHash = await bcrypt.hash(resetToken, 10);
    resetRecord.verifiedAt = new Date();
    resetRecord.expiresAt = new Date(Date.now() + RESET_WINDOW_MINUTES * 60 * 1000);
    resetRecord.attempts = 0;
    await resetRecord.save();

    return NextResponse.json(
      {
        message: "OTP confirmed. You can now set a new password.",
        resetToken,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to verify OTP right now." }, { status: 500 });
  }
}
