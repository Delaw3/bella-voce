import { requirePermission } from "@/lib/access-control";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance, { normalizeAttendanceState } from "@/models/attendance.model";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const permission = await requirePermission("probation_members.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    await connectToDatabase();

    const members = await User.find({
      choirLevel: "probation",
      status: { $ne: "DELETED" },
    } as never)
      .select("firstName lastName email voicePart choirLevel profilePicture createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const items = await Promise.all(
      members.map(async (member) => {
        const attendance = await Attendance.find({ userId: member._id } as never)
          .sort({ date: -1, createdAt: -1 })
          .limit(12)
          .lean();

        const normalizedAttendance = attendance.map((item) => {
          const state = normalizeAttendanceState(item);
          const status = state.excused ? "EXCUSED" : state.absent ? "ABSENT" : state.present ? "PRESENT" : "ABSENT";

          return {
            id: item._id.toString(),
            date: item.date.toISOString(),
            status,
          };
        });

        return {
          id: member._id.toString(),
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email ?? "",
          voicePart: member.voicePart ?? "",
          choirLevel: member.choirLevel ?? "probation",
          profilePicture: member.profilePicture ?? "",
          attendance: normalizedAttendance,
          attendanceSummary: {
            total: attendance.length,
            present: attendance.filter((item) => normalizeAttendanceState(item).present).length,
            absent: attendance.filter((item) => normalizeAttendanceState(item).absent).length,
            excused: attendance.filter((item) => normalizeAttendanceState(item).excused).length,
          },
        };
      }),
    );

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch probation members.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
