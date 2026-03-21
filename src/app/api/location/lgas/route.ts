import { getNigeriaLgasByState } from "@/lib/nigeria-locations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state")?.trim() ?? "";

  if (!state) {
    return NextResponse.json({ message: "state query parameter is required." }, { status: 400 });
  }

  const lgas = getNigeriaLgasByState(state);
  if (lgas.length === 0) {
    return NextResponse.json({ message: "No LGAs found for this state." }, { status: 404 });
  }

  return NextResponse.json({ state, lgas }, { status: 200 });
}
