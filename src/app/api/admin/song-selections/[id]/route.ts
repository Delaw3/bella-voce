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

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("song_selections.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid song selection id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const selection = await SongSelection.findById(id).lean();

    if (!selection) {
      return NextResponse.json({ message: "Song selection not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json(
      {
        selection: {
          id: selection._id.toString(),
          title: selection.title,
          selectionDate: selection.selectionDate.toISOString(),
          status: selection.status,
          songs: selection.songs.map((songItem) => ({
            part: songItem.part,
            song: songItem.song,
            key: songItem.key,
          })),
          createdAt: selection.createdAt.toISOString(),
          updatedAt: selection.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch song selection." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("song_selections.edit");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid song selection id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()) as never,
  };

  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) return NextResponse.json({ message: "Title cannot be empty." }, { status: 400 });
    updates.title = title;
  }

  if (payload.selectionDate !== undefined) {
    const selectionDate = new Date(payload.selectionDate.trim());
    if (Number.isNaN(selectionDate.getTime())) {
      return NextResponse.json({ message: "Provide a valid selection date." }, { status: 400 });
    }
    updates.selectionDate = selectionDate;
  }

  if (payload.songs !== undefined) {
    const songs = normalizeSongs(payload.songs);
    if (songs.length === 0) {
      return NextResponse.json({ message: "At least one song row is required." }, { status: 400 });
    }
    updates.songs = songs;
  }

  if (payload.status !== undefined) {
    const status = payload.status.trim().toUpperCase();
    if (!SONG_SELECTION_STATUSES.includes(status as (typeof SONG_SELECTION_STATUSES)[number])) {
      return NextResponse.json({ message: "Invalid song selection status." }, { status: 400 });
    }
    updates.status = status;
  }

  try {
    await connectToDatabase();
    const selection = await SongSelection.findByIdAndUpdate(id, updates, { new: true }).lean();

    if (!selection) {
      return NextResponse.json({ message: "Song selection not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: selection.status === "POSTED" ? "Song selection posted successfully." : "Song selection saved for review.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update song selection." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("song_selections.delete");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid song selection id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await SongSelection.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Song selection not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Song selection deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete song selection." }, { status: 500 });
  }
}
