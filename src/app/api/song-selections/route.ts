import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import SongSelection from "@/models/song-selection.model";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const selections = await SongSelection.find({ status: "POSTED" })
      .select("title selectionDate")
      .sort({ selectionDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        selections: selections.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          selectionDate: item.selectionDate.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch song selections." }, { status: 500 });
  }
}
