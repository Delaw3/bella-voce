import { requirePermission } from "@/lib/access-control";
import { serializeAdminMember, toPositiveInt } from "@/lib/admin-users";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const permission = await requirePermission("members.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const purpose = searchParams.get("purpose")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const page = toPositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  try {
    if (purpose === "selector") {
      await connectToDatabase();

      const filter = {
        ...(q
          ? {
              $or: [
                { firstName: { $regex: q, $options: "i" } },
                { lastName: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { username: { $regex: q, $options: "i" } },
              ],
            }
          : {}),
        status: { $ne: "DELETED" },
      };

      const members = await User.find(filter)
        .select(
          "firstName lastName email username phoneNumber phoneNumber2 address educationLevel voicePart stateOfOrigin lga choirLevel posts post role permissions profilePicture onboardingCompleted status createdAt",
        )
        .sort({ firstName: 1, lastName: 1, createdAt: -1 })
        .lean();

      return NextResponse.json(
        {
          members: members.map(serializeAdminMember),
        },
        { status: 200 },
      );
    }

    const payload = await remember(
      cacheKeys.adminMembersList(page, limit, q),
      CACHE_TTL.adminMembersList,
      async () => {
        await connectToDatabase();

        const filter = {
          ...(q
            ? {
                $or: [
                  { firstName: { $regex: q, $options: "i" } },
                  { lastName: { $regex: q, $options: "i" } },
                  { email: { $regex: q, $options: "i" } },
                  { username: { $regex: q, $options: "i" } },
                  { voicePart: { $regex: q, $options: "i" } },
                ],
              }
            : {}),
          status: { $ne: "DELETED" },
        };

        const [members, total] = await Promise.all([
          User.find(filter)
            .select(
              "firstName lastName email username phoneNumber phoneNumber2 address educationLevel voicePart stateOfOrigin lga choirLevel posts post role permissions profilePicture onboardingCompleted status createdAt",
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          User.countDocuments(filter),
        ]);

        return {
          members: members.map(serializeAdminMember),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        };
      },
    );

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch members right now." }, { status: 500 });
  }
}
