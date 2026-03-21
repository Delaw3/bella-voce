import { requirePermission } from "@/lib/access-control";
import { connectToDatabase } from "@/lib/mongodb";
import { USER_ROLES, UserRole } from "@/lib/user-config";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  userId?: string;
  role?: string;
};

export async function POST(request: Request) {
  const permission = await requirePermission("roles_permissions.edit");
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
  const role = payload.role?.trim().toUpperCase() ?? "";

  if (!userId || !role) {
    return NextResponse.json({ message: "userId and role are required." }, { status: 400 });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ message: "Invalid userId." }, { status: 400 });
  }

  if (!USER_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ message: "Invalid role value." }, { status: 400 });
  }

  await connectToDatabase();

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true },
  ).lean();

  if (!updatedUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      message: "User role updated successfully.",
      user: {
        id: String(updatedUser._id),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      },
    },
    { status: 200 },
  );
}
