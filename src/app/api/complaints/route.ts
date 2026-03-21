import { requireAuthenticatedUser } from "@/lib/auth-api";
import {
  DEFAULT_COMPLAINT_LIMIT,
  DEFAULT_COMPLAINT_PAGE,
  MAX_COMPLAINT_LIMIT,
  parseComplaintInput,
  serializeComplaint,
  toPositiveInt,
} from "@/lib/complaints";
import { connectToDatabase } from "@/lib/mongodb";
import Complaint from "@/models/complaint.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type ComplaintPayload = {
  subject?: string;
  message?: string;
};

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ message: "Forbidden: insufficient permissions." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = toPositiveInt(searchParams.get("page"), DEFAULT_COMPLAINT_PAGE);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), DEFAULT_COMPLAINT_LIMIT), MAX_COMPLAINT_LIMIT);
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();

    const [complaints, total] = await Promise.all([
      Complaint.find()
        .populate("userId", "firstName lastName email profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(),
    ]);

    return NextResponse.json(
      {
        complaints: complaints.map(serializeComplaint),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch complaints right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: ComplaintPayload;

  try {
    payload = (await request.json()) as ComplaintPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const complaintInput = parseComplaintInput(payload);

  if (!complaintInput) {
    return NextResponse.json(
      { message: "Subject and message are required and must be within the allowed length." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    await Complaint.create({
      userId: actorId as never,
      subject: complaintInput.subject,
      message: complaintInput.message,
    });

    return NextResponse.json(
      { message: "Your complaint has been submitted successfully." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to submit your complaint right now." }, { status: 500 });
  }
}
