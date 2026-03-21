import { AUTH_COOKIE_NAME, getUserBySessionToken } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/mongodb";
import {
  isValidNigeriaLgaForState,
  isValidNigeriaState,
  resolveLgaNameForState,
  resolveStateName,
} from "@/lib/nigeria-locations";
import { CHOIR_LEVELS, EDUCATION_LEVELS, VOICE_PARTS } from "@/models/user.model";
import User from "@/models/user.model";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Payload = {
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  stateOfOrigin?: string;
  lga?: string;
  educationLevel?: string;
  voicePart?: string;
  choirLevel?: string;
  profilePictureUrl?: string;
};

function normalizeEnumValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const user = await getUserBySessionToken(token);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in again." }, { status: 401 });
  }

  const phoneNumber = payload.phoneNumber?.trim() ?? "";
  const phoneNumber2 = payload.phoneNumber2?.trim() ?? "";
  const address = payload.address?.trim() ?? "";
  const stateOfOrigin = payload.stateOfOrigin?.trim() ?? "";
  const lga = payload.lga?.trim() ?? "";
  const educationLevel = payload.educationLevel?.trim() ?? "";
  const voicePart = payload.voicePart?.trim() ?? "";
  const choirLevel = payload.choirLevel?.trim() ?? "";
  const profilePictureUrl = payload.profilePictureUrl?.trim() ?? "";
  const normalizedEducationLevel = normalizeEnumValue(educationLevel);
  const normalizedVoicePart = normalizeEnumValue(voicePart);
  const normalizedChoirLevel = normalizeEnumValue(choirLevel);

  if (!phoneNumber || !address || !stateOfOrigin || !lga || !educationLevel || !voicePart || !choirLevel) {
    return NextResponse.json(
      {
        message:
          "Phone number, address, state of origin, LGA, education level, voice part, and choir level are required.",
      },
      { status: 400 },
    );
  }

  if (!isValidNigeriaState(stateOfOrigin)) {
    return NextResponse.json({ message: "Please select a valid Nigerian state." }, { status: 400 });
  }

  if (!isValidNigeriaLgaForState(stateOfOrigin, lga)) {
    return NextResponse.json({ message: "Please select a valid LGA for your state." }, { status: 400 });
  }

  if (!EDUCATION_LEVELS.includes(normalizedEducationLevel as (typeof EDUCATION_LEVELS)[number])) {
    return NextResponse.json({ message: "Please select a valid education level." }, { status: 400 });
  }

  if (!VOICE_PARTS.includes(normalizedVoicePart as (typeof VOICE_PARTS)[number])) {
    return NextResponse.json({ message: "Please select a valid voice part." }, { status: 400 });
  }

  if (!CHOIR_LEVELS.includes(normalizedChoirLevel as (typeof CHOIR_LEVELS)[number])) {
    return NextResponse.json({ message: "Please select a valid choir level." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const resolvedStateName = resolveStateName(stateOfOrigin);
    const resolvedLgaName = resolveLgaNameForState(stateOfOrigin, lga);

    if (!resolvedStateName || !resolvedLgaName) {
      return NextResponse.json(
        { message: "Unable to resolve selected state and LGA values." },
        { status: 400 },
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
      phoneNumber,
      phoneNumber2: phoneNumber2 || undefined,
      address,
      stateOfOrigin: resolvedStateName,
      lga: resolvedLgaName,
      educationLevel: normalizedEducationLevel,
      voicePart: normalizedVoicePart,
      choirLevel: normalizedChoirLevel,
      profilePicture: profilePictureUrl || undefined,
      onboardingCompleted: true,
      },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Onboarding completed successfully.",
        nextPath: "/dashboard",
        savedProfile: {
          stateOfOrigin: updatedUser.stateOfOrigin ?? "",
          lga: updatedUser.lga ?? "",
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to complete onboarding right now." }, { status: 500 });
  }
}
