import { requirePermission } from "@/lib/access-control";
import { invalidateAdminDashboardCache } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import SongSelection, { SONG_SELECTION_STATUSES } from "@/models/song-selection.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  title?: string;
  selectionDate?: string;
  songs?: Array<{ part?: string; song?: string; key?: string }>;
  status?: string;
};

function normalizeSongs(songs: Payload["songs"]) {
  return (songs ?? [])
    .map((song) => ({
      part: song.part?.trim() ?? "",
      song: song.song?.trim() ?? "",
      key: song.key?.trim() ?? "",
    }))
    .filter((song) => song.part || song.song || song.key);
}

export async function GET() {
  const permission = await requirePermission("song_selections.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    await connectToDatabase();
    const selections = await SongSelection.find().sort({ selectionDate: -1, createdAt: -1 }).lean();

    return NextResponse.json(
      {
        selections: selections.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          selectionDate: item.selectionDate.toISOString(),
          status: item.status,
          songs: item.songs.map((songItem) => ({
            part: songItem.part,
            song: songItem.song,
            key: songItem.key,
          })),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch song selections." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("song_selections.create");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const title = payload.title?.trim() ?? "";
  const selectionDate = new Date(payload.selectionDate?.trim() ?? "");
  const songs = normalizeSongs(payload.songs);
  const status = payload.status?.trim().toUpperCase() ?? "IN_REVIEW";

  if (!title || Number.isNaN(selectionDate.getTime()) || songs.length === 0) {
    return NextResponse.json({ message: "Title, date, and at least one song row are required." }, { status: 400 });
  }

  if (!SONG_SELECTION_STATUSES.includes(status as (typeof SONG_SELECTION_STATUSES)[number])) {
    return NextResponse.json({ message: "Invalid song selection status." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(permission.user._id.toString());
    const selection = await SongSelection.create({
      title,
      selectionDate,
      songs,
      status,
      createdBy: actorId as never,
      updatedBy: actorId as never,
    });

    await invalidateAdminDashboardCache();

    return NextResponse.json(
      { message: "Song selection created successfully.", id: selection._id.toString() },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to create song selection." }, { status: 500 });
  }
}
