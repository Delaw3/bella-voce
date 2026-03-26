import { sendPasswordResetOtpMail } from "@/lib/mail";
import { connectToDatabase } from "@/lib/mongodb";
import PasswordResetOtp from "@/models/password-reset-otp.model";
import User from "@/models/user.model";
import { EMAIL_PATTERN, capitalizeWords, normalizeEmail } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type Payload = {
  email?: string;
};

const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email ?? "");
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ email }).select("_id firstName email").lean();

    if (!user) {
      return NextResponse.json({ message: "No account was found for this email." }, { status: 404 });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await PasswordResetOtp.deleteMany({ email });

    const resetRecord = await PasswordResetOtp.create({
      userId: user._id as never,
      email,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    try {
      await sendPasswordResetOtpMail({
        to: user.email,
        firstName: capitalizeWords(user.firstName ?? "Member"),
        otp,
      });
    } catch {
      await PasswordResetOtp.findByIdAndDelete(resetRecord._id);
      return NextResponse.json({ message: "We found your account, but could not send the OTP right now." }, { status: 500 });
    }

    return NextResponse.json(
      {
        message:
          "OTP sent to your email. Please check your inbox, and check your spam folder if you do not see it.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to process your request right now." }, { status: 500 });
  }
}
