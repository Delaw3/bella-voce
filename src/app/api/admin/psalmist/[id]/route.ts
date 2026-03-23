import { requirePermission } from "@/lib/access-control";
import { invalidateAdminPsalmistCache, invalidatePsalmistMonthCaches } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import { getPsalmistMonthKey, normalizePsalmistDateInput, serializePsalmistItem } from "@/lib/psalmist";
import { notifyUser } from "@/lib/push-notifications";
import Psalmist from "@/models/psalmist.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  assignmentDate?: string;
  userId?: string;
  notifySelectedUser?: boolean;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("psalmist.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid psalmist assignment id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const item = await Psalmist.findById(id)
      .populate("userId", "firstName lastName voicePart profilePicture")
      .lean();

    if (!item) {
      return NextResponse.json({ message: "Psalmist assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ item: serializePsalmistItem(item) }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch psalmist assignment." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("psalmist.edit");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid psalmist assignment id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const existing = await Psalmist.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ message: "Psalmist assignment not found." }, { status: 404 });
    }

    const nextDate =
      payload.assignmentDate !== undefined
        ? normalizePsalmistDateInput(payload.assignmentDate?.trim() ?? "")
        : existing.assignmentDate;
    if (!nextDate) {
      return NextResponse.json({ message: "Select a valid assignment date." }, { status: 400 });
    }

    const nextUserId = payload.userId?.trim() ?? existing.userId.toString();
    if (!mongoose.isValidObjectId(nextUserId)) {
      return NextResponse.json({ message: "Select a valid user." }, { status: 400 });
    }

    const selectedUser = await User.findOne({ _id: nextUserId, status: { $ne: "DELETED" } })
      .select("_id")
      .lean();
    if (!selectedUser) {
      return NextResponse.json({ message: "Selected user was not found." }, { status: 404 });
    }

    const nextMonthKey = getPsalmistMonthKey(nextDate);
    const nextUserObjectId = new mongoose.Types.ObjectId(nextUserId);
    const assignmentChanged =
      existing.userId.toString() !== nextUserId || existing.assignmentDate.getTime() !== nextDate.getTime();

    const updated = await Psalmist.findByIdAndUpdate(
      id,
      {
        assignmentDate: nextDate,
        monthKey: nextMonthKey,
        year: nextDate.getUTCFullYear(),
        month: nextDate.getUTCMonth() + 1,
        userId: nextUserObjectId,
        updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()) as never,
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Psalmist assignment not found." }, { status: 404 });
    }

    await Promise.all([invalidateAdminPsalmistCache(), invalidatePsalmistMonthCaches()]);

    if (payload.notifySelectedUser !== false && assignmentChanged) {
      const displayDate = nextDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });

      await notifyUser({
        userId: nextUserId,
        title: "Psalmist schedule updated",
        message: `Your psalmist schedule has been updated for ${displayDate}.`,
        type: "REMINDER",
        route: `/dashboard/psalmist?month=${nextMonthKey}`,
        dedupeKey: `psalmist:update:${updated._id.toString()}:${nextUserId}:${updated.updatedAt.toISOString()}`,
      });

      if (existing.userId.toString() !== nextUserId) {
        await notifyUser({
          userId: existing.userId.toString(),
          title: "Psalmist schedule updated",
          message: `Your previous psalmist assignment has been updated.`,
          type: "INFO",
          route: `/dashboard/psalmist?month=${existing.monthKey}`,
          dedupeKey: `psalmist:reassigned:${updated._id.toString()}:${existing.userId.toString()}:${updated.updatedAt.toISOString()}`,
        });
      }
    }

    return NextResponse.json({ message: "Psalmist assignment updated successfully." }, { status: 200 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number((error as { code?: number }).code) : 0;
    if (code === 11000) {
      return NextResponse.json({ message: "A psalmist assignment already exists for that date." }, { status: 409 });
    }

    return NextResponse.json({ message: "Unable to update psalmist assignment." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("psalmist.delete");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid psalmist assignment id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Psalmist.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Psalmist assignment not found." }, { status: 404 });
    }

    await Promise.all([invalidateAdminPsalmistCache(), invalidatePsalmistMonthCaches()]);

    return NextResponse.json({ message: "Psalmist assignment deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete psalmist assignment." }, { status: 500 });
  }
}
