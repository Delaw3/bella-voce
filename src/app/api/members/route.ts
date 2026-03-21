import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { capitalizeWords } from "@/lib/utils";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authUser = await requireAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const hasPosts = searchParams.get("hasPosts") === "true";

  try {
    await connectToDatabase();

    const searchFilter: Record<string, unknown> | null = q
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { voicePart: { $regex: q, $options: "i" } },
            { stateOfOrigin: { $regex: q, $options: "i" } },
          ],
        }
      : null;

    const postsFilter: Record<string, unknown> | null = hasPosts ? { posts: { $exists: true, $ne: [] } } : null;
    const filter =
      searchFilter && postsFilter ? { $and: [searchFilter, postsFilter] } : searchFilter ?? postsFilter ?? {};

    const members = await User.find(filter as never)
      .select(
        "firstName lastName email phoneNumber phoneNumber2 address educationLevel voicePart stateOfOrigin lga posts profilePicture",
      )
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    return NextResponse.json(
      {
        members: members.map((member) => ({
          id: member._id.toString(),
          firstName: capitalizeWords(member.firstName),
          lastName: capitalizeWords(member.lastName),
          email: member.email ?? "",
          phoneNumber: member.phoneNumber ?? "",
          phoneNumber2: member.phoneNumber2 ?? "",
          address: member.address ?? "",
          educationLevel: member.educationLevel ?? "",
          voicePart: member.voicePart ?? "",
          stateOfOrigin: member.stateOfOrigin ?? "",
          lga: member.lga ?? "",
          posts: member.posts ?? [],
          profilePicture: member.profilePicture ?? "",
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch members right now." }, { status: 500 });
  }
}
