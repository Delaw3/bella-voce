import { requirePermission } from "@/lib/access-control";
import { canRoleHoldPermissions, normalizePermissions, sanitizePermissionsForRole } from "@/lib/user-config";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  permissions?: string[];
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

  try {
    await connectToDatabase();
    const existingUser = await User.findById(id).select("role").lean();

    if (!existingUser) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    const nextPermissions = normalizePermissions(payload.permissions);
    if (nextPermissions.length && !canRoleHoldPermissions(existingUser.role)) {
      return NextResponse.json(
        { message: "Only ADMIN and SUPER_ADMIN accounts can keep admin permissions. Change the role first." },
        { status: 400 },
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      { permissions: sanitizePermissionsForRole(existingUser.role, nextPermissions) },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Member permissions updated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to update member permissions." }, { status: 500 });
  }
}
