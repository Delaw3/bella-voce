import { handleApiError } from "@/lib/api-error-handler";
import { generateRegistrationId } from "@/lib/generate-registration-id";
import { sendWaitlistRegistrationMail } from "@/lib/mail";
import { connectToDatabase } from "@/lib/mongodb";
import { EMAIL_PATTERN, normalizeEmail } from "@/lib/utils";
import Waitlist from "@/models/waitlist.model";
import { NextResponse } from "next/server";

type WaitlistPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export async function POST(request: Request) {
  let payload: WaitlistPayload;

  try {
    payload = (await request.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const firstName = payload.firstName?.trim().toLowerCase() ?? "";
  const lastName = payload.lastName?.trim().toLowerCase() ?? "";
  const email = normalizeEmail(payload.email ?? "");

  const fieldErrors: Record<string, string> = {};

  if (!firstName) fieldErrors.firstName = "First name is required.";
  if (!lastName) fieldErrors.lastName = "Last name is required.";
  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        message: "Please correct the highlighted fields.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();

    const existingByEmail = await Waitlist.findOne({ email }).lean();
    if (existingByEmail) {
      return NextResponse.json(
        {
          message: "This email is already on the Bella Voce waitlist.",
          fieldErrors: { email: "Email already registered." },
        },
        { status: 409 },
      );
    }

    let uniqueId = "";
    let uniqueIdExists = true;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      uniqueId = generateRegistrationId();
      uniqueIdExists = Boolean(await Waitlist.exists({ uniqueId }));
      if (!uniqueIdExists) break;
    }

    if (uniqueIdExists || !uniqueId) {
      return NextResponse.json(
        {
          message:
            "Unable to reserve a registration ID right now. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    const createdRecord = await Waitlist.create({
      firstName,
      lastName,
      email,
      uniqueId,
    });

    try {
      await sendWaitlistRegistrationMail({
        to: createdRecord.email,
        firstName: createdRecord.firstName,
        registrationId: createdRecord.uniqueId,
      });
    } catch {
      return NextResponse.json(
        {
          message:
            "Your details were saved successfully, but we could not send your registration ID email right now.",
          registrationId: createdRecord.uniqueId,
          emailSent: false,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        message:
          "Thank you for joining the Bella Voce waitlist. Your registration ID has been sent to your email.",
        registrationId: createdRecord.uniqueId,
        emailSent: true,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleApiError(error, {
      validationMessage: "Please provide valid waitlist details.",
      duplicateMessage: "This email is already on the Bella Voce waitlist.",
      duplicateFieldErrors: { email: "Email already registered." },
      fallbackMessage: "Unable to process your waitlist request right now.",
    });
  }
}
