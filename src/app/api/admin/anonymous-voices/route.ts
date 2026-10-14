import { requirePermission } from "@/lib/access-control";
import { serializeAnonymousMessage } from "@/lib/anonymous-voices";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousMessage, { AnonymousMessageRecord } from "@/models/anonymous-message.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const permission = await requirePermission("anonymous_voices.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (statusParam === "NEW" || statusParam === "REVIEWED") {
    query.status = statusParam;
  }

  try {
    await connectToDatabase();

    const [messages, totalFiltered, totalAll, totalNew, totalReviewed] = await Promise.all([
      AnonymousMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnonymousMessage.countDocuments(query),
      AnonymousMessage.countDocuments(),
      AnonymousMessage.countDocuments({ status: "NEW" }),
      AnonymousMessage.countDocuments({ status: "REVIEWED" }),
    ]);

    type LeanWithId = AnonymousMessageRecord & { _id: mongoose.Types.ObjectId };

    return NextResponse.json(
      {
        messages: (messages as LeanWithId[]).map(serializeAnonymousMessage),
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
        },
        counts: {
          total: totalAll,
          new: totalNew,
          reviewed: totalReviewed,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to load anonymous messages right now." },
      { status: 500 },
    );
  }
}
