import { requireAuthenticatedUser } from "@/lib/auth-api";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidateAdminMembersCache, invalidateUserDashboardCache, invalidateUserProfileCache } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import {
  isValidNigeriaLgaForState,
  isValidNigeriaState,
  resolveLgaNameForState,
  resolveStateName,
} from "@/lib/nigeria-locations";
import { capitalizeWords } from "@/lib/utils";
import { CHOIR_LEVELS, EDUCATION_LEVELS, VOICE_PARTS } from "@/models/user.model";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const payload = await remember(cacheKeys.userProfile(user._id.toString()), CACHE_TTL.userProfile, async () => ({
    profile: {
      id: user._id.toString(),
      firstName: user.firstName ? capitalizeWords(user.firstName) : "",
      lastName: user.lastName ? capitalizeWords(user.lastName) : "",
      email: user.email ?? "",
      username: user.username ?? "",
      phoneNumber: user.phoneNumber ?? "",
      phoneNumber2: user.phoneNumber2 ?? "",
      address: user.address ?? "",
      stateOfOrigin: user.stateOfOrigin ?? "",
      lga: user.lga ?? "",
      educationLevel: user.educationLevel ?? "",
      voicePart: user.voicePart ?? "",
      choirLevel: user.choirLevel ?? "member",
      posts: user.posts ?? [],
      permissions: user.permissions ?? [],
      role: user.role,
      status: user.status ?? "ACTIVE",
      profilePicture: user.profilePicture ?? "",
    },
  }));

  return NextResponse.json(payload, { status: 200 });
}

type Payload = {
  firstName?: string;
  lastName?: string;
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

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const phoneNumber = payload.phoneNumber?.trim() ?? "";
  const phoneNumber2 = payload.phoneNumber2?.trim() ?? "";
  const address = payload.address?.trim() ?? "";
  const stateOfOrigin = payload.stateOfOrigin?.trim() ?? "";
  const lga = payload.lga?.trim() ?? "";
  const educationLevelRaw = payload.educationLevel?.trim() ?? "";
  const voicePartRaw = payload.voicePart?.trim() ?? "";
  const choirLevelRaw = payload.choirLevel?.trim() ?? "";
  const profilePictureUrl = payload.profilePictureUrl?.trim() ?? "";

  if (!firstName || !lastName || !phoneNumber || !address || !stateOfOrigin || !lga) {
    return NextResponse.json(
      {
        message: "First name, last name, phone number, address, state of origin, and LGA are required.",
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

  const normalizedEducationLevel = educationLevelRaw ? normalizeEnumValue(educationLevelRaw) : "";
  const normalizedVoicePart = voicePartRaw ? normalizeEnumValue(voicePartRaw) : "";
  const normalizedChoirLevel = choirLevelRaw ? normalizeEnumValue(choirLevelRaw) : "";

  if (
    normalizedEducationLevel &&
    !EDUCATION_LEVELS.includes(normalizedEducationLevel as (typeof EDUCATION_LEVELS)[number])
  ) {
    return NextResponse.json({ message: "Please select a valid education level." }, { status: 400 });
  }

  if (normalizedVoicePart && !VOICE_PARTS.includes(normalizedVoicePart as (typeof VOICE_PARTS)[number])) {
    return NextResponse.json({ message: "Please select a valid voice part." }, { status: 400 });
  }

  if (normalizedChoirLevel && !CHOIR_LEVELS.includes(normalizedChoirLevel as (typeof CHOIR_LEVELS)[number])) {
    return NextResponse.json({ message: "Please select a valid choir level." }, { status: 400 });
  }

  const resolvedState = resolveStateName(stateOfOrigin);
  const resolvedLga = resolveLgaNameForState(stateOfOrigin, lga);

  if (!resolvedState || !resolvedLga) {
    return NextResponse.json({ message: "Unable to resolve selected state and LGA." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        firstName,
        lastName,
        phoneNumber,
        phoneNumber2: phoneNumber2 || undefined,
        address,
        stateOfOrigin: resolvedState,
        lga: resolvedLga,
        educationLevel: normalizedEducationLevel || undefined,
        voicePart: normalizedVoicePart || undefined,
        choirLevel: normalizedChoirLevel || undefined,
        profilePicture: profilePictureUrl || undefined,
      },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    await Promise.all([
      invalidateUserProfileCache(updated._id.toString()),
      invalidateUserDashboardCache(updated._id.toString()),
      invalidateAdminMembersCache(),
    ]);

    return NextResponse.json(
      {
        message: "Profile updated successfully.",
        profile: {
          id: updated._id.toString(),
          firstName: updated.firstName ? capitalizeWords(updated.firstName) : "",
          lastName: updated.lastName ? capitalizeWords(updated.lastName) : "",
          email: updated.email ?? "",
          username: updated.username ?? "",
          phoneNumber: updated.phoneNumber ?? "",
          phoneNumber2: updated.phoneNumber2 ?? "",
          address: updated.address ?? "",
          stateOfOrigin: updated.stateOfOrigin ?? "",
          lga: updated.lga ?? "",
          educationLevel: updated.educationLevel ?? "",
          voicePart: updated.voicePart ?? "",
          choirLevel: updated.choirLevel ?? "member",
          posts: updated.posts ?? [],
          permissions: updated.permissions ?? [],
          role: updated.role,
          status: updated.status ?? "ACTIVE",
          profilePicture: updated.profilePicture ?? "",
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update profile right now." }, { status: 500 });
  }
}
