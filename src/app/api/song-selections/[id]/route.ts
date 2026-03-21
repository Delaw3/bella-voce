import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import SongSelection from "@/models/song-selection.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { id } = await context.params;
  const selectionId = id?.trim() ?? "";

  if (!mongoose.isValidObjectId(selectionId)) {
    return NextResponse.json({ message: "Invalid song selection id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const selection = await SongSelection.findOne({ _id: selectionId, status: "POSTED" }).lean();

    if (!selection) {
      return NextResponse.json({ message: "Song selection not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        selection: {
          id: selection._id.toString(),
          title: selection.title,
          selectionDate: selection.selectionDate.toISOString(),
          songs: selection.songs.map((songItem) => ({
            part: songItem.part,
            song: songItem.song,
            key: songItem.key,
          })),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch song selection details." }, { status: 500 });
  }
}
