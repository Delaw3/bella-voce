import {
  calculateManyUserAccountability,
  ensureUserAdjustments,
  getUserAdjustmentEntries,
  migrateLegacyUserAdjustments,
  syncUserAdjustmentTotals,
} from "@/lib/accountability";
import { requireAnyPermission, requirePermission } from "@/lib/access-control";
import { invalidateAdminSummaryCaches, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import { notifyManyUsers, notifyUser } from "@/lib/push-notifications";
import AccountabilityAdjustment from "@/models/accountability-adjustment.model";
import UserFinance from "@/models/user-finance.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  userId?: string;
  userIds?: string[];
  itemId?: string;
  type?: "PLEDGED" | "FINE" | "LEVY";
  amount?: number;
  reason?: string;
};

function toAmount(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  const permission = await requirePermission("accountability.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";
  const yearParam = Number(searchParams.get("year"));
  const year = Number.isFinite(yearParam) && yearParam > 0 ? yearParam : new Date().getFullYear();

  if (userId) {
    const entryPermission = await requirePermission("accountability_items.view");

    if (!entryPermission.ok) {
      return NextResponse.json({ message: entryPermission.message }, { status: entryPermission.status });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
    }

    try {
      await connectToDatabase();
      const entries = await getUserAdjustmentEntries(userId);

      return NextResponse.json(
        {
          items: entries.map((entry) => ({
            id: entry._id.toString(),
            type: entry.type,
            amount: Number(entry.amount || 0),
            reason: entry.reason ?? "",
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
          })),
        },
        { status: 200 },
      );
    } catch {
      return NextResponse.json({ message: "Unable to fetch accountability items." }, { status: 500 });
    }
  }

  try {
    await connectToDatabase();

    const filter = q
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .select("firstName lastName email role profilePicture")
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const userIds = users.map((user) => new mongoose.Types.ObjectId(user._id.toString()));
    await Promise.all(userIds.map((item) => migrateLegacyUserAdjustments(item)));
    const [breakdowns, adjustments] = await Promise.all([
      calculateManyUserAccountability(userIds, year),
      UserFinance.find({ userId: { $in: userIds } } as never).lean(),
    ]);
    const adjustmentsMap = new Map(adjustments.map((item) => [item.userId.toString(), item]));

    return NextResponse.json(
      {
        items: users.map((user) => {
          const finance = breakdowns.get(user._id.toString());
          const adjustment = adjustmentsMap.get(user._id.toString());

          return {
            userId: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email ?? "",
            profilePicture: user.profilePicture ?? "",
            role: user.role,
            finance: {
              pledged: Number(finance?.pledged || 0),
              fine: Number(finance?.fine || 0),
              levy: Number(finance?.levy || 0),
              updatedAt: adjustment?.updatedAt ? new Date(adjustment.updatedAt).toISOString() : "",
            },
          };
        }),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch accountability records." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const permission = await requirePermission("accountability_items.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const itemId = payload.itemId?.trim() ?? "";
  const amount = toAmount(payload.amount);
  const reason = payload.reason?.trim() ?? "";

  if (!mongoose.isValidObjectId(itemId)) {
    return NextResponse.json({ message: "Invalid accountability item id." }, { status: 400 });
  }

  if (!payload.type || !["PLEDGED", "FINE", "LEVY"].includes(payload.type)) {
    return NextResponse.json({ message: "Select a valid accountability item type." }, { status: 400 });
  }

  if (amount === null) {
    return NextResponse.json({ message: "Amount must be a valid number of 0 or more." }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ message: "Reason is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const updated = await AccountabilityAdjustment.findByIdAndUpdate(
      itemId,
      {
        $set: {
          type: payload.type,
          amount,
          reason,
          updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
        },
      } as never,
      { new: true, runValidators: true } as never,
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Accountability item not found." }, { status: 404 });
    }

    await syncUserAdjustmentTotals(updated.userId.toString());
    await Promise.all([
      invalidateUserPaymentCaches(updated.userId.toString()),
      invalidateAdminSummaryCaches(),
    ]);

    await notifyUser({
      userId: updated.userId.toString(),
      title: `${payload.type} updated`,
      message: `${payload.type} was updated to N${amount.toLocaleString()} for ${reason}.`,
      type: payload.type === "FINE" || payload.type === "LEVY" ? "ALERT" : "INFO",
      route: "/dashboard/pay",
      dedupeKey: `accountability-update:${updated._id.toString()}:${updated.updatedAt.toISOString()}`,
    });

    return NextResponse.json(
      {
        message: "Accountability item updated successfully.",
        item: {
          id: updated._id.toString(),
          type: updated.type,
          amount: Number(updated.amount || 0),
          reason: updated.reason ?? "",
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update accountability item." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const userId = payload.userId?.trim() ?? "";
  const userIds = Array.isArray(payload.userIds) ? payload.userIds.map((item) => item.trim()).filter(Boolean) : [];
  const amount = toAmount(payload.amount);
  const reason = payload.reason?.trim() ?? "";
  const isBulkLevyRequest = userIds.length > 0;

  const permission = isBulkLevyRequest
    ? await requireAnyPermission(["accountability.edit", "accountability_items.edit"])
    : await requirePermission("accountability_items.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  if (!payload.type || !["PLEDGED", "FINE", "LEVY"].includes(payload.type)) {
    return NextResponse.json({ message: "Select a valid accountability item type." }, { status: 400 });
  }

  if (amount === null) {
    return NextResponse.json({ message: "Amount must be a valid number of 0 or more." }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ message: "Reason is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    if (userIds.length > 0) {
      if (payload.type !== "LEVY") {
        return NextResponse.json({ message: "Bulk accountability updates currently support levy only." }, { status: 400 });
      }

      const validUserIds = userIds.filter((item) => mongoose.isValidObjectId(item));

      if (validUserIds.length === 0) {
        return NextResponse.json({ message: "Select at least one valid user." }, { status: 400 });
      }

      const users = await User.find({
        _id: { $in: validUserIds.map((item) => new mongoose.Types.ObjectId(item)) },
        status: { $ne: "DELETED" },
      } as never)
        .select("_id")
        .lean();

      if (users.length === 0) {
        return NextResponse.json({ message: "No eligible users were found for this levy." }, { status: 400 });
      }

      const actorId = new mongoose.Types.ObjectId(permission.user._id.toString());
      const targetUserIds = users.map((user) => user._id.toString());

      await Promise.all(targetUserIds.map((targetUserId) => ensureUserAdjustments(targetUserId)));

      const createdItems = await AccountabilityAdjustment.insertMany(
        targetUserIds.map((targetUserId) => ({
          userId: new mongoose.Types.ObjectId(targetUserId),
          type: "LEVY" as const,
          amount,
          reason,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      );

      await Promise.all([
        ...targetUserIds.map((targetUserId) => syncUserAdjustmentTotals(targetUserId)),
        ...targetUserIds.map((targetUserId) => invalidateUserPaymentCaches(targetUserId)),
        invalidateAdminSummaryCaches(),
      ]);

      await notifyManyUsers(
        targetUserIds.map((targetUserId, index) => ({
          userId: targetUserId,
          title: "LEVY added",
          message: `LEVY of N${amount.toLocaleString()} was added for ${reason}.`,
          type: "ALERT" as const,
          route: "/dashboard/pay",
          dedupeKey: `accountability-bulk-levy:${createdItems[index]?._id?.toString() ?? targetUserId}`,
        })),
      );

      return NextResponse.json(
        {
          message: `Levy added successfully for ${targetUserIds.length} user${targetUserIds.length === 1 ? "" : "s"}.`,
          createdCount: targetUserIds.length,
        },
        { status: 201 },
      );
    }

    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    await ensureUserAdjustments(objectUserId);
    const created = await AccountabilityAdjustment.create({
      userId: objectUserId,
      type: payload.type,
      amount,
      reason,
      createdBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
      updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
    } as never);

    await syncUserAdjustmentTotals(objectUserId);
    await Promise.all([
      invalidateUserPaymentCaches(objectUserId.toString()),
      invalidateAdminSummaryCaches(),
    ]);

    await notifyUser({
      userId: objectUserId.toString(),
      title: `${payload.type} added`,
      message: `${payload.type} of N${amount.toLocaleString()} was added for ${reason}.`,
      type: payload.type === "FINE" || payload.type === "LEVY" ? "ALERT" : "INFO",
      route: "/dashboard/pay",
      dedupeKey: `accountability-create:${created._id.toString()}`,
    });

    return NextResponse.json(
      {
        message: "Accountability item added successfully.",
        item: {
          id: created._id.toString(),
          type: created.type,
          amount: Number(created.amount || 0),
          reason: created.reason ?? "",
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to add accountability item." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const permission = await requireAnyPermission(["accountability_items.delete"]);

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("id")?.trim() ?? "";

  if (!mongoose.isValidObjectId(itemId)) {
    return NextResponse.json({ message: "Invalid accountability item id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await AccountabilityAdjustment.findByIdAndDelete(itemId).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Accountability item not found." }, { status: 404 });
    }

    await syncUserAdjustmentTotals(deleted.userId.toString());
    await Promise.all([
      invalidateUserPaymentCaches(deleted.userId.toString()),
      invalidateAdminSummaryCaches(),
    ]);

    await notifyUser({
      userId: deleted.userId.toString(),
      title: `${deleted.type} removed`,
      message: `${deleted.type} for ${deleted.reason ?? "your account"} was removed.`,
      type: "INFO",
      route: "/dashboard/pay",
      dedupeKey: `accountability-delete:${deleted._id.toString()}`,
    });

    return NextResponse.json({ message: "Accountability item deleted successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to delete accountability item." }, { status: 500 });
  }
}
