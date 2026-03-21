import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import ChoirFinance from "@/models/choir-finance.model";
import Complaint from "@/models/complaint.model";
import Excuse from "@/models/excuse.model";
import Notification from "@/models/notification.model";
import SongSelection from "@/models/song-selection.model";
import User from "@/models/user.model";

export async function getAdminDashboardSummary() {
  return remember(cacheKeys.adminDashboardSummary(), CACHE_TTL.adminDashboardSummary, async () => {
    await connectToDatabase();

    const [memberCount, adminCount, complaintCount, excusePendingCount, selectionCount, notificationCount, financeTotals] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: { $in: ["ADMIN", "SUPER_ADMIN"] } }),
        Complaint.countDocuments({ status: { $ne: "RESOLVED" } }),
        Excuse.countDocuments({ status: "PENDING" }),
        SongSelection.countDocuments(),
        Notification.countDocuments(),
        ChoirFinance.aggregate<{ _id: string; total: number }>([
          { $group: { _id: "$type", total: { $sum: "$amount" } } },
        ]),
      ]);

    const incomeTotal = Number(financeTotals.find((item) => item._id === "INCOME")?.total || 0);
    const expenseTotal = Number(financeTotals.find((item) => item._id === "EXPENSE")?.total || 0);

    return {
      memberCount,
      adminCount,
      complaintCount,
      excusePendingCount,
      selectionCount,
      notificationCount,
      incomeTotal,
      expenseTotal,
      balanceTotal: incomeTotal - expenseTotal,
    };
  });
}
