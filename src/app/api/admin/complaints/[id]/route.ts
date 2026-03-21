import { requirePermission } from "@/lib/access-control";
import { invalidateAdminDashboardCache } from "@/lib/cache-invalidation";
import { parseComplaintStatus, serializeComplaint } from "@/lib/complaints";
import { connectToDatabase } from "@/lib/mongodb";
import Complaint from "@/models/complaint.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type ComplaintUpdatePayload = {
  status?: string;
  adminNote?: string;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("complaints.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid complaint id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const complaint = await Complaint.findById(id)
      .populate("userId", "firstName lastName profilePicture")
      .lean();

    if (!complaint) {
      return NextResponse.json({ message: "Complaint not found." }, { status: 404 });
    }

    return NextResponse.json({ complaint: serializeComplaint(complaint) }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch complaint details." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("complaints.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid complaint id." }, { status: 400 });
  }

  let payload: ComplaintUpdatePayload;

  try {
    payload = (await request.json()) as ComplaintUpdatePayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const updates: { status?: string; adminNote?: string } = {};
  const nextStatus = payload.status ? parseComplaintStatus(payload.status) : null;
  const adminNote = payload.adminNote?.trim();

  if (payload.status && !nextStatus) {
    return NextResponse.json({ message: "Invalid complaint status." }, { status: 400 });
  }

  if (typeof payload.adminNote === "string" && payload.adminNote.length > 1000) {
    return NextResponse.json({ message: "Admin note must be 1000 characters or less." }, { status: 400 });
  }

  if (nextStatus) {
    updates.status = nextStatus;
  }

  if (typeof payload.adminNote === "string") {
    updates.adminNote = adminNote ?? "";
  }

  if (!updates.status && typeof updates.adminNote === "undefined") {
    return NextResponse.json({ message: "Provide a status or adminNote to update." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const complaint = await Complaint.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("userId", "firstName lastName profilePicture")
      .lean();

    if (!complaint) {
      return NextResponse.json({ message: "Complaint not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json(
      {
        message: "Complaint updated successfully.",
        complaint: serializeComplaint(complaint),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update complaint right now." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("complaints.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid complaint id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Complaint.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Complaint not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Complaint deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete complaint right now." }, { status: 500 });
  }
}
