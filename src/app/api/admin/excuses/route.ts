import { getAttendanceDateRange } from "@/lib/accountability";
import { requirePermission } from "@/lib/access-control";
import { connectToDatabase } from "@/lib/mongodb";
import Excuse from "@/models/excuse.model";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const permission = await requirePermission("excuses.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim().toUpperCase() ?? "";
  const dateParam = searchParams.get("date")?.trim() ?? "";
  const filter: Record<string, unknown> = status && ["PENDING", "APPROVED", "REJECTED"].includes(status) ? { status } : {};

  if (dateParam) {
    const { start, end } = getAttendanceDateRange(dateParam);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ message: "Invalid excuse date." }, { status: 400 });
    }
    filter.excuseDate = { $gte: start, $lt: end };
  }

  try {
    await connectToDatabase();
    const excuses = await Excuse.find(filter)
      .populate("userId", "firstName lastName voicePart profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        excuses: excuses.map((item) => {
          const sender = item.userId as
            | {
                _id?: { toString(): string };
                firstName?: string;
                lastName?: string;
                voicePart?: string;
                profilePicture?: string;
              }
            | null;

          return {
            id: item._id.toString(),
            subject: item.subject,
            reason: item.reason,
            excuseDate: item.excuseDate.toISOString(),
            status: item.status,
            adminComment: item.adminComment ?? "",
            createdAt: item.createdAt.toISOString(),
            user: sender
              ? {
                  id: sender._id?.toString() ?? "",
                  firstName: sender.firstName ?? "",
                  lastName: sender.lastName ?? "",
                  voicePart: sender.voicePart ?? "",
                  profilePicture: sender.profilePicture ?? "",
                }
              : null,
          };
        }),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch excuses." }, { status: 500 });
  }
}
