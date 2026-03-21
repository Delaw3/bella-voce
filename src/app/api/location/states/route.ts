import { getNigeriaStates } from "@/lib/nigeria-locations";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ states: getNigeriaStates() }, { status: 200 });
}
