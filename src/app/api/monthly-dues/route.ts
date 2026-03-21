import { requireAuthenticatedUser } from "@/lib/auth-api";
import { getAvailableMonthlyDuesYears, getMonthlyDuesStatus, getUserMonthlyDuesConfig } from "@/lib/accountability";
import { CACHE_TTL, remember } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = Number(searchParams.get("year"));

  try {
    const config = await getUserMonthlyDuesConfig(user._id);
    const currentYear = new Date().getFullYear();
    const availableYears = getAvailableMonthlyDuesYears(config.startYear, currentYear);
    const requestedYear = Number.isFinite(yearParam) && yearParam > 0 ? yearParam : config.startYear;
    const year = Math.min(Math.max(requestedYear, config.startYear), currentYear);
    const payload = await remember(cacheKeys.userMonthlyDues(user._id.toString(), year), CACHE_TTL.userMonthlyDues, async () => {
      const dues = await getMonthlyDuesStatus(user._id, year);

      return {
        year,
        availableYears,
        startYear: config.startYear,
        months: dues.map((item) => ({
          month: item.month,
          amount: item.amount,
          status: item.status,
          paidAt: item.paidAt,
        })),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch monthly dues." }, { status: 500 });
  }
}
