import { getUserAttendanceHistory } from "@/lib/accountability";
import { requireAuthenticatedUser } from "@/lib/auth-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = Number(searchParams.get("month"));
  const yearParam = Number(searchParams.get("year"));

  try {
    const items = await getUserAttendanceHistory(user._id, {
      month: Number.isInteger(monthParam) ? monthParam : undefined,
      year: Number.isInteger(yearParam) ? yearParam : undefined,
    });

    return NextResponse.json({ attendance: items }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch attendance history.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
