import { requirePermission } from "@/lib/access-control";
import { CHOIR_POSTS, ChoirPost } from "@/lib/user-config";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  posts?: string[];
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("members.edit");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid member id." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const posts = (payload.posts ?? []).map((post) => post.trim()).filter(Boolean);
  if (!posts.every((post) => CHOIR_POSTS.includes(post as ChoirPost))) {
    return NextResponse.json({ message: "Invalid choir post selection." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(id, { posts, post: null }, { new: true, runValidators: true }).lean();

    if (!user) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Member posts updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update member posts." }, { status: 500 });
  }
}
