import { requirePermission } from "@/lib/access-control";
import { serializeAnonymousMessage } from "@/lib/anonymous-voices";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousMessage, { AnonymousMessageRecord, AnonymousMessageStatus } from "@/models/anonymous-message.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type PatchPayload = {
  status?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("anonymous_voices.manage");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid message ID." }, { status: 400 });
  }

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const nextStatus = payload.status?.toUpperCase() as AnonymousMessageStatus;
  if (nextStatus !== "NEW" && nextStatus !== "REVIEWED") {
    return NextResponse.json(
      { message: "Status must be either NEW or REVIEWED." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const updated = await AnonymousMessage.findByIdAndUpdate(
      id,
      { $set: { status: nextStatus } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Message not found." }, { status: 404 });
    }

    type LeanWithId = AnonymousMessageRecord & { _id: mongoose.Types.ObjectId };

    return NextResponse.json(
      {
        message: `Message status marked as ${nextStatus.toLowerCase()}.`,
        item: serializeAnonymousMessage(updated as LeanWithId),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to update message status right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("anonymous_voices.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid message ID." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await AnonymousMessage.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: "Message not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Anonymous message deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Unable to delete message right now." },
      { status: 500 },
    );
  }
}
