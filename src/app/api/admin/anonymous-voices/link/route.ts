import { requirePermission } from "@/lib/access-control";
import { regenerateAnonymousLink, serializeAnonymousLink } from "@/lib/anonymous-voices";
import { NextResponse } from "next/server";

export async function GET() {
  const permission = await requirePermission("anonymous_voices.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    // The raw token is never stored, so it cannot be read back.
    // The admin UI keeps the last generated URL client-side; this endpoint
    // only reports whether a link currently exists.
    const { getActiveAnonymousLink } = await import("@/lib/anonymous-voices");
    const record = await getActiveAnonymousLink();
    return NextResponse.json({ link: serializeAnonymousLink(record) }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to retrieve public link right now." }, { status: 500 });
  }
}

export async function POST() {
  const permission = await requirePermission("anonymous_voices.manage");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const { token, record } = await regenerateAnonymousLink(permission.user._id.toString());
    return NextResponse.json(
      {
        message: "New public link generated. The previous link no longer works.",
        token,
        link: serializeAnonymousLink(record),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to generate public link right now." }, { status: 500 });
  }
}
