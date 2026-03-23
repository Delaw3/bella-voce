import { requireAuthenticatedUser } from "@/lib/auth-api";
import { calculateUserAccountability, checkUserDebt } from "@/lib/accountability";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import Excuse from "@/models/excuse.model";
import Notification from "@/models/notification.model";
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
    await checkUserDebt(actorId, currentYear);
    const payload = await remember(
      cacheKeys.userDashboardSummary(user._id.toString(), currentYear),
      CACHE_TTL.userDashboardSummary,
      async () => {
        const accountability = await calculateUserAccountability(actorId, currentYear);

        await connectToDatabase();

        const [notifications, unreadNotificationCount, activeAlert, excusePreview] = await Promise.all([
          Notification.find().where("userId").equals(actorId).sort({ createdAt: -1 }).limit(5).lean(),
          Notification.countDocuments().where("userId").equals(actorId).where("isRead").equals(false),
          Notification.findOne().where("userId").equals(actorId).where("type").equals("ALERT").where("isRead").equals(false).sort({ createdAt: -1 }).lean(),
          Excuse.find().where("userId").equals(actorId).sort({ createdAt: -1 }).limit(3).lean(),
        ]);

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
          notifications: notifications.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            message: item.message,
            type: item.type,
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            route: item.route ?? "",
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
