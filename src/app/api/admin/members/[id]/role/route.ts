import { requirePermission } from "@/lib/access-control";
import { USER_ROLES, UserRole } from "@/lib/user-config";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  role?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("roles_permissions.edit");

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

  const role = payload.role?.trim().toUpperCase() ?? "";

  if (!USER_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ message: "Invalid role value." }, { status: 400 });
  }

  if (permission.user.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN") {
    return NextResponse.json({ message: "Only SUPER_ADMIN can assign SUPER_ADMIN role." }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true }).lean();

    if (!user) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Member role updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update member role." }, { status: 500 });
  }
}
