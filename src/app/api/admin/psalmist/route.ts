import { requirePermission } from "@/lib/access-control";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidateAdminPsalmistCache, invalidatePsalmistMonthCaches } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getPsalmistMonthKey,
  normalizePsalmistDateInput,
  parsePsalmistMonthKey,
  serializePsalmistItem,
} from "@/lib/psalmist";
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

export async function GET(request: Request) {
  const permission = await requirePermission("psalmist.view");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const month = parsePsalmistMonthKey(searchParams.get("month"));
  const q = searchParams.get("q")?.trim() ?? "";

  if (!month) {
    return NextResponse.json({ message: "Provide a valid month filter." }, { status: 400 });
  }

  try {
    const payload = await remember(cacheKeys.adminPsalmistMonth(month.monthKey, q), CACHE_TTL.adminPsalmistMonth, async () => {
      await connectToDatabase();

      let userIds: mongoose.Types.ObjectId[] | null = null;
      if (q) {
        const users = await User.find({
          status: { $ne: "DELETED" },
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
            { voicePart: { $regex: q, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();

        userIds = users.map((user) => new mongoose.Types.ObjectId(user._id.toString()));
      }

      const filter: Record<string, unknown> = { monthKey: month.monthKey };

      if (userIds) {
        filter.userId = { $in: userIds };
      }

      const items = await Psalmist.find(filter as never)
        .populate("userId", "firstName lastName voicePart profilePicture")
        .sort({ assignmentDate: 1, createdAt: 1 })
        .lean();

      return {
        month: month.monthKey,
        items: items.map((item) => serializePsalmistItem(item)),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch psalmist schedule." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("psalmist.create");
  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const assignmentDate = normalizePsalmistDateInput(payload.assignmentDate?.trim() ?? "");
  const userId = payload.userId?.trim() ?? "";
  const shouldNotify = payload.notifySelectedUser !== false;

  if (!assignmentDate) {
    return NextResponse.json({ message: "Select a valid assignment date." }, { status: 400 });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Select a valid user." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const selectedUser = await User.findOne({ _id: userId, status: { $ne: "DELETED" } })
      .select("firstName lastName")
      .lean();

    if (!selectedUser) {
      return NextResponse.json({ message: "Selected user was not found." }, { status: 404 });
    }

    const monthKey = getPsalmistMonthKey(assignmentDate);
    const actorId = new mongoose.Types.ObjectId(permission.user._id.toString());

    const created = await Psalmist.create({
      assignmentDate,
      monthKey,
      year: assignmentDate.getUTCFullYear(),
      month: assignmentDate.getUTCMonth() + 1,
      userId: new mongoose.Types.ObjectId(userId),
      createdBy: actorId,
      updatedBy: actorId,
    } as never);

    await Promise.all([invalidateAdminPsalmistCache(), invalidatePsalmistMonthCaches()]);

    if (shouldNotify) {
      await notifyUser({
        userId,
        title: "Psalmist selection",
        message: `You have been selected as psalmist for ${assignmentDate.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}.`,
        type: "INFO",
        route: `/dashboard/psalmist?month=${monthKey}`,
        dedupeKey: `psalmist:create:${created._id.toString()}:${userId}`,
      });
    }

    return NextResponse.json({ message: "Psalmist assignment created successfully." }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number((error as { code?: number }).code) : 0;
    if (code === 11000) {
      return NextResponse.json({ message: "A psalmist assignment already exists for that date." }, { status: 409 });
    }

    return NextResponse.json({ message: "Unable to create psalmist assignment." }, { status: 500 });
  }
}
