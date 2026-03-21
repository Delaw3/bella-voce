import { connectToDatabase } from "@/lib/mongodb";
import { capitalizeWords } from "@/lib/utils";
import Waitlist from "@/models/waitlist.model";
import { NextResponse } from "next/server";

type Payload = { uniqueId?: string };

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const uniqueId = payload.uniqueId?.trim().toUpperCase() ?? "";

  if (!uniqueId) {
    return NextResponse.json({ message: "Unique ID is required." }, { status: 400 });
  }

  await connectToDatabase();

  const waitlist = await Waitlist.findOne({ uniqueId }).lean();
  if (!waitlist) {
    return NextResponse.json(
      { message: "We could not find that unique ID on the Bella Voce waitlist." },
      { status: 404 },
    );
  }

  if (waitlist.signupCompleted) {
    return NextResponse.json(
      { message: "This unique ID has already been used for account creation." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      message: "Unique ID verified.",
      waitlist: {
        firstName: capitalizeWords(waitlist.firstName),
        lastName: capitalizeWords(waitlist.lastName),
        email: waitlist.email,
        uniqueId: waitlist.uniqueId,
      },
    },
    { status: 200 },
  );
}
