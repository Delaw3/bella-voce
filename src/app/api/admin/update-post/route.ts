import { requirePermission } from "@/lib/access-control";
import { connectToDatabase } from "@/lib/mongodb";
import { CHOIR_POSTS, ChoirPost } from "@/lib/user-config";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  userId?: string;
  posts?: string[];
};

export async function POST(request: Request) {
  const permission = await requirePermission("members.edit");
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
  const posts = (payload.posts ?? []).map((post) => post.trim()).filter(Boolean);

  if (!userId || !posts.length) {
    return NextResponse.json({ message: "userId and posts are required." }, { status: 400 });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid userId." }, { status: 400 });
  }

  if (!posts.every((post) => CHOIR_POSTS.includes(post as ChoirPost))) {
    return NextResponse.json({ message: "Invalid post value." }, { status: 400 });
  }

  await connectToDatabase();

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { posts, post: null },
    { new: true, runValidators: true },
  ).lean();

  if (!updatedUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      message: "User posts updated successfully.",
      user: {
        id: String(updatedUser._id),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        posts: updatedUser.posts ?? [],
      },
    },
    { status: 200 },
  );
}
