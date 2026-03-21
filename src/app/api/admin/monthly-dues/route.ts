import {
  ensureAccountabilitySettings,
  ensureMonthlyDuesForYear,
  getAvailableMonthlyDuesYears,
  resolveUserMonthlyDuesStartYear,
} from "@/lib/accountability";
import {
  MONTHLY_DUES_START_YEAR_MAX,
  MONTHLY_DUES_YEAR_OPTIONS,
} from "@/lib/accountability-years";
import { requirePermission } from "@/lib/access-control";
import { invalidateAdminSummaryCaches, invalidateUserPaymentCaches } from "@/lib/cache-invalidation";
import { DUE_MONTH_NUMBERS, getMonthLabel } from "@/lib/monthly-dues";
import { connectToDatabase } from "@/lib/mongodb";
import MonthlyDues from "@/models/monthly-dues.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  userId?: string;
  year?: number;
  month?: number;
  paid?: boolean;
  monthlyDuesStartYear?: number;
  removedMonths?: number[];
};

function sanitizeRemovedMonths(months?: number[] | null) {
  return [...new Set((months ?? []).filter((month): month is number => DUE_MONTH_NUMBERS.includes(month as (typeof DUE_MONTH_NUMBERS)[number])))]
    .sort((left, right) => left - right);
}

export async function GET(request: Request) {
  const permission = await requirePermission("monthly_dues.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const yearParam = Number(searchParams.get("year"));
  const requestedYear = Number.isFinite(yearParam) && yearParam > 0 ? yearParam : new Date().getFullYear();

  try {
    await connectToDatabase();
    const settings = await ensureAccountabilitySettings();
    const globalStartYear = Number(settings?.monthlyDuesStartYear || MONTHLY_DUES_YEAR_OPTIONS[0]);
    const currentYear = new Date().getFullYear();

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
      .select("firstName lastName email profilePicture monthlyDuesStartYear removedMonthlyDuesMonths")
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const items = await Promise.all(
      users.map(async (user) => {
        const startYear = resolveUserMonthlyDuesStartYear(globalStartYear, user.monthlyDuesStartYear);
        const removedMonths = sanitizeRemovedMonths(user.removedMonthlyDuesMonths);
        const availableYears = getAvailableMonthlyDuesYears(startYear, currentYear);
        const selectedYear = requestedYear;
        const duesEntries =
          selectedYear >= startYear && selectedYear <= currentYear
            ? await ensureMonthlyDuesForYear(new mongoose.Types.ObjectId(user._id.toString()), selectedYear)
            : [];
        const duesMap = new Map(duesEntries.map((entry) => [entry.month, entry]));
        const months = DUE_MONTH_NUMBERS.filter((month) => !removedMonths.includes(month)).map((month) => {
          const entry = duesMap.get(month);

          return {
            month: getMonthLabel(month),
            monthNumber: month,
            amount: Number(settings?.monthlyDues || 0),
            status: entry?.paid ? "PAID" : "NOT_PAID",
            paidAt: entry?.paidAt ? new Date(entry.paidAt).toISOString() : undefined,
          };
        });

        return {
          userId: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email ?? "",
          profilePicture: user.profilePicture ?? "",
          monthlyDuesStartYear: startYear,
          removedMonths,
          availableYears,
          selectedYear,
          months,
        };
      }),
    );

    return NextResponse.json(
      {
        year: requestedYear,
        settings: {
          monthlyDues: Number(settings?.monthlyDues || 0),
          monthlyDuesStartYear: globalStartYear,
          currentYear,
        },
        items,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch monthly dues records." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const permission = await requirePermission("monthly_dues.mark_paid");

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

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const settings = await ensureAccountabilitySettings();
    const globalStartYear = Number(settings?.monthlyDuesStartYear || MONTHLY_DUES_YEAR_OPTIONS[0]);
    const currentYear = new Date().getFullYear();

    if (Array.isArray(payload.removedMonths) || typeof payload.monthlyDuesStartYear === "number") {
      const requestedStartYear = Number(payload.monthlyDuesStartYear);
      const removedMonths = sanitizeRemovedMonths(payload.removedMonths);
      const nextStartYear =
        Number.isInteger(requestedStartYear) &&
        requestedStartYear >= globalStartYear &&
        requestedStartYear <= MONTHLY_DUES_START_YEAR_MAX
          ? requestedStartYear
          : globalStartYear;

      if (
        Number.isInteger(requestedStartYear) &&
        (requestedStartYear < globalStartYear || requestedStartYear > MONTHLY_DUES_START_YEAR_MAX)
      ) {
        return NextResponse.json(
          {
            message: `User monthly dues start year must be between ${globalStartYear} and ${MONTHLY_DUES_START_YEAR_MAX}.`,
          },
          { status: 400 },
        );
      }

      await User.findByIdAndUpdate(
        new mongoose.Types.ObjectId(userId),
        {
          $set: {
            monthlyDuesStartYear: nextStartYear,
            removedMonthlyDuesMonths: removedMonths,
          },
        } as never,
        { new: true, runValidators: true } as never,
      );

      await MonthlyDues.deleteMany({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [{ year: { $lt: nextStartYear } }, { month: { $in: removedMonths } }],
      } as never);

      await Promise.all([
        invalidateUserPaymentCaches(userId),
        invalidateAdminSummaryCaches(),
      ]);

      return NextResponse.json({ message: "User monthly dues settings updated successfully." }, { status: 200 });
    }

    const year = Number(payload.year);
    const month = Number(payload.month);

    if (!Number.isInteger(year) || year < globalStartYear) {
      return NextResponse.json({ message: "Invalid year." }, { status: 400 });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ message: "Invalid month." }, { status: 400 });
    }

    if (typeof payload.paid !== "boolean") {
      return NextResponse.json({ message: "Invalid paid state." }, { status: 400 });
    }

    const user = await User.findById(new mongoose.Types.ObjectId(userId))
      .select("monthlyDuesStartYear removedMonthlyDuesMonths")
      .lean();
    const startYear = resolveUserMonthlyDuesStartYear(globalStartYear, user?.monthlyDuesStartYear);
    const removedMonths = sanitizeRemovedMonths(user?.removedMonthlyDuesMonths);

    if (year < startYear) {
      return NextResponse.json({ message: `This member starts owing monthly dues from ${startYear}.` }, { status: 400 });
    }

    if (removedMonths.includes(month)) {
      return NextResponse.json({ message: "This month has been removed for the selected member." }, { status: 400 });
    }

    await MonthlyDues.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), year, month } as never,
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          year,
          month,
        },
        $set: {
          paid: payload.paid,
          paidAt: payload.paid ? new Date() : null,
        },
      } as never,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true } as never,
    );

    await Promise.all([
      invalidateUserPaymentCaches(userId),
      invalidateAdminSummaryCaches(),
    ]);

    return NextResponse.json({ message: "Monthly dues status updated successfully." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update monthly dues status.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
