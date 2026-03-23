import { requirePermission } from "@/lib/access-control";
import { invalidateAdminPaymentsCache, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import {
  approvePaymentTransaction,
  createPaymentTransaction,
  getOutstandingPaymentData,
  listAdminPaymentTransactions,
  PaymentItemInput,
} from "@/lib/payments";
import { connectToDatabase } from "@/lib/mongodb";
import { notifyUser } from "@/lib/push-notifications";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type ManualPayload = {
  userId?: string;
  category?: "LEVY" | "FINE" | "LATENESS_FEE" | "ABSENT_FEE" | "PLEDGE";
  amount?: number;
  description?: string;
  year?: number;
  accountabilityDate?: string;
  transferNote?: string;
  adminNote?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const purpose = searchParams.get("purpose")?.trim() ?? "";

  if (purpose === "manual-members") {
    const permission = await requirePermission("payments.create");

    if (!permission.ok) {
      return NextResponse.json({ message: permission.message }, { status: permission.status });
    }

    const q = searchParams.get("q")?.trim() ?? "";

    try {
      await connectToDatabase();

      const filter = {
        ...(q
          ? {
              $or: [
                { firstName: { $regex: q, $options: "i" } },
                { lastName: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { username: { $regex: q, $options: "i" } },
              ],
            }
          : {}),
        status: { $ne: "DELETED" },
      };

      const members = await User.find(filter)
        .select("firstName lastName email status createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();

      const manualMembers = await Promise.all(
        members.map(async (member) => {
          const outstanding = await getOutstandingPaymentData(member._id);
          const owedGroups = outstanding.owedGroups
            .filter((group) => group.category !== "MONTHLY_DUES")
            .map((group) => ({
              category: group.category,
              label: group.label,
              amount: group.totalAmount,
            }))
            .filter((group) => group.amount > 0);

          const owedByCategory = {
            LEVY: owedGroups.find((group) => group.category === "LEVY")?.amount ?? 0,
            FINE: owedGroups.find((group) => group.category === "FINE")?.amount ?? 0,
            LATENESS_FEE: owedGroups.find((group) => group.category === "LATENESS_FEE")?.amount ?? 0,
            ABSENT_FEE: owedGroups.find((group) => group.category === "ABSENT_FEE")?.amount ?? 0,
            PLEDGE: owedGroups.find((group) => group.category === "PLEDGE")?.amount ?? 0,
          };

          return {
            id: member._id.toString(),
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email ?? "",
            owedGroups,
            owedByCategory,
          };
        }),
      );

      return NextResponse.json({ members: manualMembers }, { status: 200 });
    } catch {
      return NextResponse.json({ message: "Unable to search members." }, { status: 500 });
    }
  }

  const permission = await requirePermission("payments.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const status = (searchParams.get("status")?.trim().toUpperCase() || "ALL") as "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  const query = searchParams.get("q")?.trim() ?? "";

  try {
    const result = await listAdminPaymentTransactions({ page, limit, status, query });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payments." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("payments.create");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: ManualPayload;
  try {
    payload = (await request.json()) as ManualPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const userId = payload.userId?.trim() ?? "";
  const description = payload.description?.trim() ?? "";
  const amount = Number(payload.amount || 0);

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Select a valid user." }, { status: 400 });
  }

  if (!payload.category || !["LEVY", "FINE", "LATENESS_FEE", "ABSENT_FEE", "PLEDGE"].includes(payload.category)) {
    return NextResponse.json({ message: "Select a valid payment category." }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "Amount must be greater than zero." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(userId).select("firstName lastName email").lean();
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const outstanding = await getOutstandingPaymentData(userId);
    const owedGroup = outstanding.owedGroups.find((group) => group.category === payload.category);
    const maxAmount = Number(owedGroup?.totalAmount || 0);

    if (maxAmount <= 0) {
      return NextResponse.json({ message: `This user has no outstanding ${payload.category.replace("_", " ").toLowerCase()}.` }, { status: 400 });
    }

    if (amount > maxAmount) {
      return NextResponse.json(
        { message: `Amount cannot be more than the user's outstanding ${owedGroup?.label.toLowerCase() ?? "balance"}.` },
        { status: 400 },
      );
    }

    const items: PaymentItemInput[] = [
      {
        category: payload.category,
        description: description || `${payload.category.replace("_", " ")} payment recorded by admin`,
        amount,
        year: payload.year ? Number(payload.year) : new Date().getFullYear(),
        accountabilityDate: payload.accountabilityDate ? new Date(payload.accountabilityDate) : undefined,
        quantity: 1,
      },
    ];

    const transaction = await createPaymentTransaction({
      userId,
      transactionType: "ACCOUNTABILITY",
      items,
      transferNote: payload.transferNote,
    });

    if (!transaction) {
      return NextResponse.json({ message: "Unable to create payment record." }, { status: 500 });
    }

    const approved = await approvePaymentTransaction({
      transactionId: transaction.id,
      approvedBy: permission.user._id,
      adminNote: payload.adminNote || "Recorded and approved by admin.",
    });

    await Promise.all([
      invalidateUserPaymentCaches(userId),
      invalidateAdminPaymentsCache(),
    ]);

    if (approved?.user?.id) {
      await notifyUser({
        userId: approved.user.id,
        title: "Payment confirmed",
        message: `A payment of N${approved.totalAmount.toLocaleString()} was recorded and approved for your account.`,
        type: "INFO",
        route: `/dashboard/pay/history/${approved.id}`,
        dedupeKey: `payment-manual-approved:${approved.id}`,
      });
    }

    return NextResponse.json(
      {
        message: "Manual payment recorded successfully.",
        transaction: approved,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record manual payment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
