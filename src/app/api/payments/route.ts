import { notifyAdminsOfUserActivity } from "@/lib/admin-activity-notifications";
import { requireAuthenticatedUser } from "@/lib/auth-api";
import { invalidateAdminPaymentsCache, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import {
  createPaymentTransaction,
  getOutstandingPaymentData,
  PaymentItemInput,
} from "@/lib/payments";
import { NextResponse } from "next/server";

type Payload = {
  transactionType?: "ACCOUNTABILITY" | "MONTHLY_DUES" | "CUSTOM";
  items?: PaymentItemInput[];
  selectedAccountId?: string;
  transferNote?: string;
};

function buildItemKey(item: PaymentItemInput) {
  return [
    item.category,
    item.description.trim(),
    Number(item.amount || 0).toFixed(2),
    item.month ?? "",
    item.year ?? "",
    item.accountabilityDate ? new Date(item.accountabilityDate).toISOString() : "",
  ].join("|");
}

export async function GET() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const data = await getOutstandingPaymentData(user._id);
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment options." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!payload.transactionType || !items.length) {
    return NextResponse.json({ message: "Select at least one payment item." }, { status: 400 });
  }

  try {
    if (payload.transactionType === "CUSTOM") {
      if (items.some((item) => item.category !== "CUSTOM" || Number(item.amount || 0) <= 0 || !item.description?.trim())) {
        return NextResponse.json({ message: "Custom payments require a valid description and amount." }, { status: 400 });
      }
    } else {
      const outstanding = await getOutstandingPaymentData(user._id);
      const availableKeys = new Map<string, number>();

      for (const item of outstanding.owedGroups.flatMap((group) => group.items)) {
        const key = buildItemKey(item);
        availableKeys.set(key, Number(availableKeys.get(key) || 0) + 1);
      }

      for (const item of items) {
        const key = buildItemKey(item);
        const count = Number(availableKeys.get(key) || 0);
        if (count <= 0) {
          return NextResponse.json({ message: "One or more selected payment items are no longer available." }, { status: 400 });
        }
        availableKeys.set(key, count - 1);
      }
    }

    const transaction = await createPaymentTransaction({
      userId: user._id,
      transactionType: payload.transactionType,
      items,
      selectedAccountId: payload.selectedAccountId,
      transferNote: payload.transferNote,
    });

    if (transaction?.id) {
      await notifyAdminsOfUserActivity({
        actorUserId: user._id.toString(),
        actorName: `${user.firstName} ${user.lastName}`.trim(),
        event: "payment_submitted",
        itemId: transaction.id,
      });
    }

    await Promise.all([
      invalidateUserPaymentCaches(user._id.toString()),
      invalidateAdminPaymentsCache(),
    ]);

    return NextResponse.json(
      {
        message: "Transaction pending, waiting for confirmation",
        transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit payment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
