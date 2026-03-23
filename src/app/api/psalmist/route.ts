import { requireAuthenticatedUser } from "@/lib/auth-api";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import { parsePsalmistMonthKey, serializePsalmistItem } from "@/lib/psalmist";
import Psalmist from "@/models/psalmist.model";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parsePsalmistMonthKey(searchParams.get("month"));

  if (!month) {
    return NextResponse.json({ message: "Provide a valid month filter." }, { status: 400 });
  }

  try {
    const payload = await remember(cacheKeys.psalmistMonth(month.monthKey), CACHE_TTL.userPsalmistMonth, async () => {
      await connectToDatabase();
      const items = await Psalmist.find({ monthKey: month.monthKey })
        .populate("userId", "firstName lastName voicePart profilePicture")
        .sort({ assignmentDate: 1, createdAt: 1 })
        .lean();

      return {
        month: month.monthKey,
        items: items.map((item) => serializePsalmistItem(item)),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch psalmist schedule." }, { status: 500 });
  }
}
