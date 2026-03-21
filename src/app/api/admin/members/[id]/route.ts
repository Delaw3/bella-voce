import { calculateUserAccountability } from "@/lib/accountability";
import { requirePermission } from "@/lib/access-control";
import { serializeAdminMember } from "@/lib/admin-users";
import { invalidateAdminDashboardCache, invalidateAdminMembersCache, invalidateUserReadCaches } from "@/lib/cache-invalidation";
import {
  canRoleHoldPermissions,
  normalizePermissions,
  sanitizePermissionsForRole,
  USER_ROLES,
  USER_STATUSES,
} from "@/lib/user-config";
import { connectToDatabase } from "@/lib/mongodb";
import User, { EDUCATION_LEVELS, VOICE_PARTS } from "@/models/user.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

type Payload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  stateOfOrigin?: string;
  lga?: string;
  educationLevel?: string;
  voicePart?: string;
  status?: string;
  role?: string;
  posts?: string[];
  permissions?: string[];
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("members.view");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid member id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const [member, accountability] = await Promise.all([
      User.findById(id)
        .select(
          "firstName lastName email username phoneNumber phoneNumber2 address stateOfOrigin lga educationLevel voicePart choirLevel posts post role permissions profilePicture onboardingCompleted status createdAt",
        )
        .lean(),
      calculateUserAccountability(id),
    ]);

    if (!member || member.status === "DELETED") {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    return NextResponse.json(
      { member: { ...serializeAdminMember(member), totalOwed: accountability.breakdown.totalOwed } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to fetch member details." }, { status: 500 });
  }
}

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

  const updates: Record<string, unknown> = {};
  let nextRole = permission.user.role;
  let nextPermissions = permission.user.permissions ?? undefined;

  if (payload.firstName !== undefined) updates.firstName = payload.firstName.trim();
  if (payload.lastName !== undefined) updates.lastName = payload.lastName.trim();
  if (payload.email !== undefined) updates.email = payload.email.trim().toLowerCase();
  if (payload.username !== undefined) updates.username = payload.username.trim().toLowerCase();
  if (payload.phoneNumber !== undefined) updates.phoneNumber = payload.phoneNumber.trim();
  if (payload.phoneNumber2 !== undefined) updates.phoneNumber2 = payload.phoneNumber2.trim();
  if (payload.address !== undefined) updates.address = payload.address.trim();
  if (payload.stateOfOrigin !== undefined) updates.stateOfOrigin = payload.stateOfOrigin.trim();
  if (payload.lga !== undefined) updates.lga = payload.lga.trim();

  if (payload.educationLevel !== undefined) {
    const educationLevel = payload.educationLevel.trim().toLowerCase();
    if (educationLevel && !EDUCATION_LEVELS.includes(educationLevel as (typeof EDUCATION_LEVELS)[number])) {
      return NextResponse.json({ message: "Invalid education level." }, { status: 400 });
    }
    updates.educationLevel = educationLevel || undefined;
  }

  if (payload.voicePart !== undefined) {
    const voicePart = payload.voicePart.trim().toLowerCase();
    if (voicePart && !VOICE_PARTS.includes(voicePart as (typeof VOICE_PARTS)[number])) {
      return NextResponse.json({ message: "Invalid voice part." }, { status: 400 });
    }
    updates.voicePart = voicePart || undefined;
  }

  if (payload.status !== undefined) {
    const status = payload.status.trim().toUpperCase();
    if (!USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) {
      return NextResponse.json({ message: "Invalid status." }, { status: 400 });
    }
    updates.status = status;
  }

  if (payload.role !== undefined) {
    const rolePermission = await requirePermission("roles_permissions.edit");
    if (!rolePermission.ok) {
      return NextResponse.json({ message: rolePermission.message }, { status: rolePermission.status });
    }
    const role = payload.role.trim().toUpperCase();
    if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      return NextResponse.json({ message: "Invalid role." }, { status: 400 });
    }
    updates.role = role;
    nextRole = role as (typeof USER_ROLES)[number];
  }

  if (payload.posts !== undefined) {
    updates.posts = payload.posts.map((post) => post.trim()).filter(Boolean);
    updates.post = null;
  }

  if (payload.permissions !== undefined) {
    const permissionGate = await requirePermission("roles_permissions.edit");
    if (!permissionGate.ok) {
      return NextResponse.json({ message: permissionGate.message }, { status: permissionGate.status });
    }
    nextPermissions = normalizePermissions(payload.permissions);
  }

  if (payload.role !== undefined || payload.permissions !== undefined) {
    if (nextPermissions?.length && !canRoleHoldPermissions(nextRole)) {
      return NextResponse.json(
        { message: "Only ADMIN and SUPER_ADMIN accounts can keep admin permissions. Change the role first." },
        { status: 400 },
      );
    }
    updates.permissions = sanitizePermissionsForRole(nextRole, nextPermissions);
  }

  try {
    await connectToDatabase();
    const member = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .select(
        "firstName lastName email username phoneNumber phoneNumber2 address stateOfOrigin lga educationLevel voicePart choirLevel posts post role permissions profilePicture onboardingCompleted status createdAt",
      )
      .lean();

    if (!member) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    const accountability = await calculateUserAccountability(id);
    await Promise.all([
      invalidateAdminMembersCache(),
      invalidateAdminDashboardCache(),
      invalidateUserReadCaches(id),
    ]);

    return NextResponse.json(
      {
        message: "Member updated successfully.",
        member: { ...serializeAdminMember(member), totalOwed: accountability.breakdown.totalOwed },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "Unable to update member." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const permission = await requirePermission("members.delete");

  if (!permission.ok) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid member id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const member = await User.findByIdAndUpdate(
      id,
      { status: "INACTIVE" },
      { new: true, runValidators: true },
    ).lean();

    if (!member) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    await Promise.all([
      invalidateAdminMembersCache(),
      invalidateAdminDashboardCache(),
      invalidateUserReadCaches(id),
    ]);

    return NextResponse.json({ message: "User deactivated successfully." }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to deactivate user." }, { status: 500 });
  }
}
