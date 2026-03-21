import { requirePermission } from "@/lib/access-control";
import { invalidateAdminDashboardCache } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import Excuse from "@/models/excuse.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  status?: string;
  adminComment?: string;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("excuses.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid excuse id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const excuse = await Excuse.findById(id).populate("userId", "firstName lastName email profilePicture").lean();

    if (!excuse) {
      return NextResponse.json({ message: "Excuse not found." }, { status: 404 });
    }

    const sender = excuse.userId as
      | {
          _id?: { toString(): string };
          firstName?: string;
          lastName?: string;
          email?: string;
          profilePicture?: string;
        }
      | null;

    return NextResponse.json(
      {
        excuse: {
          id: excuse._id.toString(),
          subject: excuse.subject,
          reason: excuse.reason,
          excuseDate: excuse.excuseDate.toISOString(),
          status: excuse.status,
          adminComment: excuse.adminComment ?? "",
          createdAt: excuse.createdAt.toISOString(),
          user: sender
            ? {
                id: sender._id?.toString() ?? "",
                firstName: sender.firstName ?? "",
                lastName: sender.lastName ?? "",
                email: sender.email ?? "",
                profilePicture: sender.profilePicture ?? "",
              }
            : null,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch excuse." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("excuses.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid excuse id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const status = payload.status?.trim().toUpperCase() ?? "";
  const adminComment = payload.adminComment?.trim() ?? "";

  if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ message: "Invalid excuse status." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const excuse = await Excuse.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(status ? { status } : {}),
          ...(typeof payload.adminComment === "string" ? { adminComment } : {}),
        },
      },
      { new: true, runValidators: true },
    ).lean();

    if (!excuse) {
      return NextResponse.json({ message: "Excuse not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Excuse updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update excuse." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("excuses.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid excuse id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Excuse.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Excuse not found." }, { status: 404 });
    }

    await invalidateAdminDashboardCache();

    return NextResponse.json({ message: "Excuse deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete excuse." }, { status: 500 });
  }
}
