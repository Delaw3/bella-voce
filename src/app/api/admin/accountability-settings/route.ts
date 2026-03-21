import { ensureAccountabilitySettings } from "@/lib/accountability";
import { isValidMonthlyDuesStartYear, MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { requirePermission } from "@/lib/access-control";
import { CACHE_TTL, remember } from "@/lib/cache";
import { invalidateAccountabilitySettingsCache, invalidateAdminSummaryCaches, invalidateAllUserReadCaches } from "@/lib/cache-invalidation";
import { cacheKeys } from "@/lib/cache-keys";
import AccountabilitySettings from "@/models/accountability-settings.model";
import { NextResponse } from "next/server";

type Payload = {
  monthlyDues?: number;
  latenessFee?: number;
  absentFee?: number;
  monthlyDuesStartYear?: number;
};

function toAmount(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export async function GET() {
  const permission = await requirePermission("settings.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const payload = await remember(cacheKeys.accountabilitySettings(), CACHE_TTL.accountabilitySettings, async () => {
      const settings = await ensureAccountabilitySettings();
      return {
        settings: {
          monthlyDues: Number(settings?.monthlyDues || 0),
          latenessFee: Number(settings?.latenessFee || 0),
          absentFee: Number(settings?.absentFee || 0),
          monthlyDuesStartYear: Number(settings?.monthlyDuesStartYear || MONTHLY_DUES_YEAR_OPTIONS[0]),
        },
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to fetch accountability settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const permission = await requirePermission("settings.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const monthlyDues = toAmount(payload.monthlyDues);
  const latenessFee = toAmount(payload.latenessFee);
  const absentFee = toAmount(payload.absentFee);
  const monthlyDuesStartYear = Number(payload.monthlyDuesStartYear);

  if ([monthlyDues, latenessFee, absentFee].some((value) => value === null)) {
    return NextResponse.json({ message: "Provide valid fee amounts of 0 or more." }, { status: 400 });
  }

  if (!Number.isInteger(monthlyDuesStartYear) || !isValidMonthlyDuesStartYear(monthlyDuesStartYear)) {
    return NextResponse.json({ message: "Provide a valid monthly dues start year." }, { status: 400 });
  }

  try {
    await ensureAccountabilitySettings();
    await AccountabilitySettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          monthlyDues,
          latenessFee,
          absentFee,
          monthlyDuesStartYear,
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    await Promise.all([
      invalidateAccountabilitySettingsCache(),
      invalidateAdminSummaryCaches(),
      invalidateAllUserReadCaches(),
    ]);

    return NextResponse.json({ message: "Accountability settings updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update accountability settings." }, { status: 500 });
  }
}
