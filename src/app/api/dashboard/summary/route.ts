import { requireAuthenticatedUser } from "@/lib/auth-api";
import { calculateUserAccountability, checkUserDebt } from "@/lib/accountability";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeAttendanceState } from "@/models/attendance.model";
import Attendance from "@/models/attendance.model";
import Excuse from "@/models/excuse.model";
import Notification from "@/models/notification.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const currentYear = new Date().getFullYear();
    const actorId = new mongoose.Types.ObjectId(user._id.toString());
    try {
      await checkUserDebt(actorId, currentYear);
    } catch {
      // Reminder generation should not block the dashboard summary response.
    }
    const payload = await remember(
      cacheKeys.userDashboardSummary(user._id.toString(), currentYear),
      CACHE_TTL.userDashboardSummary,
      async () => {
        const accountability = await calculateUserAccountability(actorId, currentYear);

        await connectToDatabase();
        const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
        const startOfNextYear = new Date(Date.UTC(currentYear + 1, 0, 1));

        const [notifications, unreadNotificationCount, activeAlert, excusePreview, attendanceRecords, userRecord] = await Promise.all([
          Notification.find().where("userId").equals(actorId).sort({ createdAt: -1 }).limit(5).lean(),
          Notification.countDocuments().where("userId").equals(actorId).where("isRead").equals(false),
          Notification.findOne().where("userId").equals(actorId).where("type").equals("ALERT").where("isRead").equals(false).sort({ createdAt: -1 }).lean(),
          Excuse.find().where("userId").equals(actorId).sort({ createdAt: -1 }).limit(3).lean(),
          Attendance.find({
            userId: actorId,
            date: { $gte: startOfYear, $lt: startOfNextYear },
          } as never).lean(),
          User.findById(actorId).select("createdAt").lean(),
        ]);

        const validAttendanceRecords = attendanceRecords.filter((item) => {
          const state = normalizeAttendanceState(item);
          return state.present || state.late || state.absent || state.excused;
        });
        const attendancePresentCount = validAttendanceRecords.filter((item) => {
          const state = normalizeAttendanceState(item);
          return state.present || state.late || state.excused;
        }).length;
        const attendanceRate = validAttendanceRecords.length
          ? Math.round((attendancePresentCount / validAttendanceRecords.length) * 100)
          : 0;
        const duesClearedThisYear = accountability.details.monthlyDues.filter(
          (item) => item.status === "PAID" && item.paidAt && new Date(item.paidAt).getUTCFullYear() === currentYear,
        ).length;

        return {
          debt: {
            monthlyDues: accountability.breakdown.monthlyDues,
            absentFee: accountability.breakdown.absentFee,
            latenessFee: accountability.breakdown.latenessFee,
            pledged: accountability.breakdown.pledged,
            fine: accountability.breakdown.fine,
            levy: accountability.breakdown.levy,
            totalOwed: accountability.breakdown.totalOwed,
          },
          debtDetails: {
            monthlyDues: accountability.details.monthlyDues,
            absentFee: accountability.details.absentFee,
            latenessFee: accountability.details.latenessFee,
            pledged: accountability.details.pledged,
            fine: accountability.details.fine,
            levy: accountability.details.levy,
          },
          dashboardMetrics: {
            duesClearedThisYear,
            attendanceRate,
            memberSince: userRecord?.createdAt ? new Date(userRecord.createdAt).toISOString() : undefined,
          },
          notifications: notifications.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            message: item.message,
            type: item.type,
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            route: item.route ?? "",
            metadata: item.metadata ?? undefined,
          })),
          activeAlert: activeAlert
            ? {
                id: activeAlert._id.toString(),
                title: activeAlert.title,
                message: activeAlert.message,
                type: activeAlert.type,
                isRead: activeAlert.isRead,
                createdAt: activeAlert.createdAt.toISOString(),
                route: activeAlert.route ?? "",
                metadata: activeAlert.metadata ?? undefined,
              }
            : null,
          unreadNotificationCount,
          excusePreview: excusePreview.map((item) => ({
            id: item._id.toString(),
            subject: item.subject,
            reason: item.reason,
            excuseDate: item.excuseDate.toISOString(),
            status: item.status,
            adminComment: item.adminComment ?? "",
            createdAt: item.createdAt.toISOString(),
          })),
          monthlyDuesPreview:
            accountability.duesStatus.slice(0, 4).map((item) => ({
              month: item.month,
              amount: item.amount,
              status: item.status,
              paidAt: item.paidAt,
            })) ?? [],
        };
      },
    );

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load dashboard summary." }, { status: 500 });
  }
}
