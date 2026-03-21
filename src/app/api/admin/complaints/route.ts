import { requirePermission } from "@/lib/access-control";
import {
  DEFAULT_COMPLAINT_LIMIT,
  DEFAULT_COMPLAINT_PAGE,
  MAX_COMPLAINT_LIMIT,
  serializeComplaint,
  toPositiveInt,
} from "@/lib/complaints";
import { connectToDatabase } from "@/lib/mongodb";
import Complaint from "@/models/complaint.model";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const permission = await requirePermission("complaints.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const page = toPositiveInt(searchParams.get("page"), DEFAULT_COMPLAINT_PAGE);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), DEFAULT_COMPLAINT_LIMIT), MAX_COMPLAINT_LIMIT);
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();

    const [complaints, total] = await Promise.all([
      Complaint.find()
        .populate("userId", "firstName lastName profilePicture")
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
