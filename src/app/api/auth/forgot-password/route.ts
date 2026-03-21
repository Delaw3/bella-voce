import { NextResponse } from "next/server";

type Payload = {
  email?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  return NextResponse.json(
    {
      message:
        "If an account exists for this email, password reset instructions will be sent soon.",
    },
    { status: 200 },
  );
}
