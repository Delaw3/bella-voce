import { getAttendanceDateRange } from "@/lib/accountability";
import { requireAllPermissions, requirePermission } from "@/lib/access-control";
import { invalidateAdminSummaryCaches, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import { connectToDatabase } from "@/lib/mongodb";
import { notifyUser } from "@/lib/push-notifications";
import Attendance, {
  ATTENDANCE_STATUSES,
  AttendanceState,
  AttendanceStatus,
  attendanceStatusToState,
  getPrimaryAttendanceStatus,
  normalizeAttendanceState,
} from "@/models/attendance.model";
import Excuse from "@/models/excuse.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  userId?: string;
  date?: string;
  status?: AttendanceStatus | null;
  state?: Partial<AttendanceState>;
};

type ExcusePreview = {
  id: string;
  subject: string;
  reason: string;
  excuseDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
};

function formatAttendanceNotificationDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export async function GET(request: Request) {
  const permission = await requireAllPermissions(["attendance.view", "excuses.view"]);

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const dateParam = searchParams.get("date")?.trim() ?? "";
  const { start: selectedDate, end: nextDate } = getAttendanceDateRange(dateParam || new Date());

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
      .select("firstName lastName email voicePart profilePicture posts")
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const userIds = users.map((user) => new mongoose.Types.ObjectId(user._id.toString()));
    const attendance = await Attendance.find({
      userId: { $in: userIds },
      date: { $gte: selectedDate, $lt: nextDate },
    } as never).lean();
    const excuses = await Excuse.find({
      userId: { $in: userIds },
      excuseDate: { $gte: selectedDate, $lt: nextDate },
    } as never)
      .sort({ createdAt: -1 })
      .lean();

    const attendanceMap = new Map(
      attendance.map((item) => {
        const state = normalizeAttendanceState(item);
        return [item.userId.toString(), { state, status: getPrimaryAttendanceStatus(state) }];
      }),
    );
    const excuseMap = new Map<string, ExcusePreview>();
    for (const excuse of excuses) {
      const key = excuse.userId.toString();
      if (excuseMap.has(key)) continue;

      excuseMap.set(key, {
        id: excuse._id.toString(),
        subject: excuse.subject,
        reason: excuse.reason,
        excuseDate: excuse.excuseDate.toISOString(),
        status: excuse.status,
        adminComment: excuse.adminComment ?? "",
        createdAt: excuse.createdAt.toISOString(),
      });
    }

    return NextResponse.json(
      {
        date: selectedDate.toISOString(),
        items: users.map((user) => ({
          userId: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email ?? "",
          voicePart: user.voicePart ?? "",
          profilePicture: user.profilePicture ?? "",
          posts: user.posts ?? [],
          state: attendanceMap.get(user._id.toString())?.state ?? { present: false, late: false, absent: false, excused: false },
          status: attendanceMap.get(user._id.toString())?.status ?? null,
          excuse: excuseMap.get(user._id.toString()) ?? null,
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch attendance." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("attendance.mark");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const userId = payload.userId?.trim() ?? "";
  const dateRaw = payload.date?.trim() ?? "";

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
  }

  const { start: date, end: nextDate } = getAttendanceDateRange(dateRaw || new Date());
  const state = payload.state;
  const normalizedState =
    state && typeof state === "object"
      ? {
          present: Boolean(state.present),
          late: Boolean(state.late),
          absent: Boolean(state.absent),
          excused: Boolean(state.excused),
        }
      : (() => {
        const status = payload.status?.trim().toUpperCase() as AttendanceStatus | undefined;
        if (!status || !ATTENDANCE_STATUSES.includes(status)) {
          return null;
        }
          return attendanceStatusToState(status);
        })();

  if (!normalizedState) {
    return NextResponse.json({ message: "Invalid attendance state." }, { status: 400 });
  }

  const finalState = normalizedState.excused
    ? { present: false, late: false, absent: false, excused: true }
    : normalizedState.absent
      ? { present: false, late: false, absent: true, excused: false }
      : {
          present: normalizedState.present || normalizedState.late,
          late: normalizedState.late,
          absent: false,
          excused: false,
        };
  const primaryStatus = getPrimaryAttendanceStatus(finalState);

  try {
    await connectToDatabase();
    await Attendance.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), date } as never,
      {
        $setOnInsert: { userId: new mongoose.Types.ObjectId(userId), date },
        $set: { ...finalState, status: primaryStatus ?? undefined },
      } as never,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true } as never,
    );

    if (primaryStatus === "EXCUSED") {
      await Excuse.updateMany(
        {
          userId: new mongoose.Types.ObjectId(userId),
          excuseDate: { $gte: date, $lt: nextDate },
        } as never,
        {
          $set: {
            status: "APPROVED",
          },
        } as never,
      );
    }

    await Promise.all([
      invalidateUserPaymentCaches(userId),
      invalidateAdminSummaryCaches(),
    ]);

    if (primaryStatus) {
      await notifyUser({
        userId,
        title: "Attendance updated",
        message: `Your attendance for ${formatAttendanceNotificationDate(date)} was marked as ${primaryStatus.toLowerCase()}.`,
        type: primaryStatus === "ABSENT" ? "ALERT" : "INFO",
        route: "/dashboard/attendance-history",
        dedupeKey: `attendance:${userId}:${date.toISOString()}:${primaryStatus}`,
      });
    }

    return NextResponse.json({ message: "Attendance updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update attendance." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const permission = await requirePermission("attendance.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const userId = payload.userId?.trim() ?? "";
  const dateRaw = payload.date?.trim() ?? "";

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
  }

  const { start: date, end: nextDate } = getAttendanceDateRange(dateRaw || new Date());

  try {
    await connectToDatabase();
    await Attendance.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: date, $lt: nextDate },
    } as never);
    await Promise.all([
      invalidateUserPaymentCaches(userId),
      invalidateAdminSummaryCaches(),
    ]);
    return NextResponse.json({ message: "Attendance cleared successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to clear attendance." }, { status: 500 });
  }
}
