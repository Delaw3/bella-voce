import { notifyAdminsOfUserActivity } from "@/lib/admin-activity-notifications";
import { requireAuthenticatedUser } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import Excuse from "@/models/excuse.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type ExcusePayload = {
  subject?: string;
  reason?: string;
  excuseDate?: string;
};

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    const excuses = await Excuse.find().where("userId").equals(actorId).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        excuses: excuses.map((item) => ({
          id: item._id.toString(),
          subject: item.subject,
          reason: item.reason,
          excuseDate: item.excuseDate.toISOString(),
          status: item.status,
          adminComment: item.adminComment ?? "",
          createdAt: item.createdAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch excuses." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: ExcusePayload;

  try {
    payload = (await request.json()) as ExcusePayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const subject = payload.subject?.trim() ?? "";
  const reason = payload.reason?.trim() ?? "";
  const excuseDateRaw = payload.excuseDate?.trim() ?? "";
  const excuseDate = new Date(excuseDateRaw);

  if (!subject || !reason || !excuseDateRaw) {
    return NextResponse.json({ message: "Subject, reason, and excuse date are required." }, { status: 400 });
  }

  if (Number.isNaN(excuseDate.getTime())) {
    return NextResponse.json({ message: "Please provide a valid excuse date." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    const created = await Excuse.create({
      userId: actorId as never,
      subject,
      reason,
      excuseDate,
      status: "PENDING",
    });

    await notifyAdminsOfUserActivity({
      actorUserId: user._id.toString(),
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      event: "excuse_submitted",
      itemId: created._id.toString(),
    });

    return NextResponse.json(
      {
        message: "Your excuse request has been submitted for review.",
        excuse: {
          id: created._id.toString(),
          subject: created.subject,
          reason: created.reason,
          excuseDate: created.excuseDate.toISOString(),
          status: created.status,
          adminComment: created.adminComment ?? "",
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to submit excuse right now." }, { status: 500 });
  }
}
