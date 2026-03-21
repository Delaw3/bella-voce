import { handleApiError } from "@/lib/api-error-handler";
import { generateRegistrationId } from "@/lib/generate-registration-id";
import { requirePermission } from "@/lib/access-control";
import { sendAdminWaitlistInviteMail } from "@/lib/mail";
import { connectToDatabase } from "@/lib/mongodb";
import { EMAIL_PATTERN, capitalizeWords, normalizeEmail } from "@/lib/utils";
import User from "@/models/user.model";
import Waitlist from "@/models/waitlist.model";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WaitlistPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export async function GET(request: Request) {
  const permission = await requirePermission("waitlist.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));
    const query = url.searchParams.get("q")?.trim() ?? "";
    const filter = url.searchParams.get("filter") ?? "ALL";

    const waitlistFilter: Record<string, unknown> = {};
    if (query) {
      const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      waitlistFilter.$or = [
        { firstName: pattern },
        { lastName: pattern },
        { email: pattern },
        { uniqueId: pattern },
      ];
    }

    const waitlistRecords = await Waitlist.find(waitlistFilter as never)
      .sort({ createdAt: -1 })
      .lean();

    const registrationIds = waitlistRecords.map((item) => item.uniqueId).filter(Boolean);
    const emails = waitlistRecords.map((item) => item.email).filter(Boolean);

    const users = await User.find({
      $or: [{ uniqueId: { $in: registrationIds } }, { email: { $in: emails } }],
    } as never)
      .select("firstName lastName email uniqueId voicePart choirLevel profilePicture status onboardingCompleted createdAt")
      .lean();

    const usersByUniqueId = new Map(users.map((user) => [user.uniqueId, user]));
    const usersByEmail = new Map(users.map((user) => [user.email, user]));

    const items = waitlistRecords.map((item) => {
      const registeredUser = usersByUniqueId.get(item.uniqueId) ?? usersByEmail.get(item.email);

      return {
        id: item._id.toString(),
        firstName: capitalizeWords(item.firstName),
        lastName: capitalizeWords(item.lastName),
        email: item.email,
        uniqueId: item.uniqueId,
        source: item.source,
        status: item.status,
        signupCompleted: Boolean(item.signupCompleted),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        registrationState: registeredUser ? "REGISTERED" : "WAITLIST_ONLY",
        registeredUser: registeredUser
          ? {
              id: registeredUser._id.toString(),
              firstName: capitalizeWords(registeredUser.firstName),
              lastName: capitalizeWords(registeredUser.lastName),
              email: registeredUser.email,
              uniqueId: registeredUser.uniqueId,
              voicePart: capitalizeWords(registeredUser.voicePart ?? ""),
              choirLevel: capitalizeWords(registeredUser.choirLevel ?? "member"),
              status: registeredUser.status,
              onboardingCompleted: Boolean(registeredUser.onboardingCompleted),
              profilePicture: registeredUser.profilePicture ?? "",
              createdAt: registeredUser.createdAt.toISOString(),
            }
          : null,
      };
    });

    const filteredItems =
      filter === "REGISTERED"
        ? items.filter((item) => item.registrationState === "REGISTERED")
        : filter === "WAITLIST_ONLY"
          ? items.filter((item) => item.registrationState === "WAITLIST_ONLY")
          : items;

    const total = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const normalizedPage = Math.min(page, totalPages);
    const startIndex = (normalizedPage - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

    return NextResponse.json(
      {
        items: paginatedItems,
        summary: {
          total,
          registered: filteredItems.filter((item) => item.registrationState === "REGISTERED").length,
          waiting: filteredItems.filter((item) => item.registrationState === "WAITLIST_ONLY").length,
        },
        pagination: {
          page: normalizedPage,
          limit,
          total,
          totalPages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch waitlist records.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("waitlist.create");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

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
      { message: "Please correct the highlighted fields.", fieldErrors },
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
          message: "Unable to reserve a registration ID right now. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    const createdRecord = await Waitlist.create({
      firstName,
      lastName,
      email,
      uniqueId,
      source: "ADMIN",
    });

    try {
      await sendAdminWaitlistInviteMail({
        to: createdRecord.email,
        firstName: createdRecord.firstName,
        registrationId: createdRecord.uniqueId,
      });
    } catch {
      return NextResponse.json(
        {
          message: "Registration created, but the invitation email could not be sent right now.",
          registrationId: createdRecord.uniqueId,
          emailSent: false,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        message: "Registration created successfully. The registration ID has been emailed to the user.",
        registrationId: createdRecord.uniqueId,
        emailSent: true,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleApiError(error, {
      validationMessage: "Please provide valid registration details.",
      duplicateMessage: "This email is already on the Bella Voce waitlist.",
      duplicateFieldErrors: { email: "Email already registered." },
      fallbackMessage: "Unable to create the registration right now.",
    });
  }
}
