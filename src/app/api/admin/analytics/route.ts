import { calculateManyUserAccountability, ensureAccountabilitySettings } from "@/lib/accountability";
import { requirePermission } from "@/lib/access-control";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeAttendanceState } from "@/models/attendance.model";
import Attendance from "@/models/attendance.model";
import MonthlyDues from "@/models/monthly-dues.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  const permission = await requirePermission("analytics.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthName = now.toLocaleDateString("en-GB", { month: "long" });
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    const payload = await remember(cacheKeys.adminAnalytics(year), CACHE_TTL.adminAnalytics, async () => {
      await connectToDatabase();

      const users = await User.find({ status: { $ne: "DELETED" } })
        .select("firstName lastName profilePicture")
        .lean();

      const userIds = users.map((user) => new mongoose.Types.ObjectId(user._id.toString()));
      const breakdownMap = await calculateManyUserAccountability(userIds, year);
      const settings = await ensureAccountabilitySettings();

      const [attendanceSummaryRaw, monthlyPaidCount] = await Promise.all([
        Attendance.find({ date: { $gte: yearStart, $lt: yearEnd } } as never).lean(),
        MonthlyDues.countDocuments({ year, month, paid: true } as never),
      ]);

      const attendanceSummary = {
        present: attendanceSummaryRaw.filter((item) => {
          const state = normalizeAttendanceState(item);
          return state.present && !state.late && !state.absent;
        }).length,
        late: attendanceSummaryRaw.filter((item) => normalizeAttendanceState(item).late).length,
        absent: attendanceSummaryRaw.filter((item) => normalizeAttendanceState(item).absent).length,
      };

      const topDebtors = users
        .map((user) => ({
          userId: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture ?? "",
          totalOwed: Number(breakdownMap.get(user._id.toString())?.totalOwed || 0),
        }))
        .sort((left, right) => right.totalOwed - left.totalOwed)
        .slice(0, 10);

      const monthlyFee = Number(settings?.monthlyDues || 0);
      const totalUsers = users.length;
      const totalExpected = totalUsers * monthlyFee;
      const totalPaid = monthlyPaidCount * monthlyFee;
      const totalUnpaid = Math.max(0, totalExpected - totalPaid);

      return {
        topDebtors,
        attendanceSummary,
        duesSummary: {
          month,
          monthName,
          year,
          monthlyFee,
          totalUsers,
          totalExpected,
          totalPaid,
          totalUnpaid,
          paidUsers: monthlyPaidCount,
          unpaidUsers: Math.max(0, totalUsers - monthlyPaidCount),
        },
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load analytics." }, { status: 500 });
  }
}
