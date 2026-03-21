import { requirePermission } from "@/lib/access-control";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidatePaymentAccountCaches } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentAccount from "@/models/payment-account.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  isActive?: boolean;
};

export async function GET() {
  const permission = await requirePermission("payment_accounts.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const payload = await remember(
      cacheKeys.adminPaymentAccountsList(),
      CACHE_TTL.adminPaymentAccountsList,
      async () => {
        await connectToDatabase();
        const accounts = await PaymentAccount.find().sort({ createdAt: -1 }).lean();

        return {
          items: accounts.map((account) => ({
            id: account._id.toString(),
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            isActive: Boolean(account.isActive),
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
          })),
        };
      },
    );

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to load payment accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePermission("payment_accounts.create");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const accountName = payload.accountName?.trim() ?? "";
  const accountNumber = payload.accountNumber?.trim() ?? "";
  const bankName = payload.bankName?.trim() ?? "";

  if (!accountName || !accountNumber || !bankName) {
    return NextResponse.json({ message: "Account name, account number, and bank name are required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const created = await PaymentAccount.create({
      accountName,
      accountNumber,
      bankName,
      isActive: payload.isActive ?? true,
      createdBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
      updatedBy: new mongoose.Types.ObjectId(permission.user._id.toString()),
    } as never);

    await invalidatePaymentAccountCaches();

    return NextResponse.json(
      {
        message: "Payment account created successfully.",
        item: {
          id: created._id.toString(),
          accountName: created.accountName,
          accountNumber: created.accountNumber,
          bankName: created.bankName,
          isActive: Boolean(created.isActive),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to create payment account." }, { status: 500 });
  }
}
