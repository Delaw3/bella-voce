import { requireAuthenticatedUser } from "@/lib/auth-api";
import {
  ADMIN_ROLES,
  hasAnyPermissionValue,
  hasPermissionValue,
  PermissionKey,
  UserRole,
} from "@/lib/user-config";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { ok: false as const, status: 401, message: "Unauthorized. Please log in." };
  }

  return { ok: true as const, user };
}

export async function requireAnyRole(roles: UserRole[]) {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  if (!roles.includes(auth.user.role as UserRole)) {
    return { ok: false as const, status: 403, message: "Forbidden: insufficient permissions." };
  }

  return auth;
}

export async function requireRole(role: UserRole) {
  return requireAnyRole([role]);
}

export async function requireAdminAccess() {
  return requireAnyRole(ADMIN_ROLES);
}

export function hasPermission(
  user: { role: UserRole; permissions?: string[] | null },
  permission: PermissionKey,
) {
  return hasPermissionValue(user.role, user.permissions, permission);
}

export function hasAnyPermission(
  user: { role: UserRole; permissions?: string[] | null },
  permissions: PermissionKey[],
) {
  return hasAnyPermissionValue(user.role, user.permissions, permissions);
}

export async function requirePermission(permission: PermissionKey) {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  if (!hasPermission(auth.user, permission)) {
    return { ok: false as const, status: 403, message: "Forbidden: missing required permission." };
  }

  return auth;
}

export async function requireAnyPermission(permissions: PermissionKey[]) {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  if (!hasAnyPermission(auth.user, permissions)) {
    return { ok: false as const, status: 403, message: "Forbidden: missing required permission." };
  }

  return auth;
}

export async function requireAllPermissions(permissions: PermissionKey[]) {
  const auth = await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  const missingPermission = permissions.find((permission) => !hasPermission(auth.user, permission));
  if (missingPermission) {
    return { ok: false as const, status: 403, message: "Forbidden: missing required permission." };
  }

  return auth;
}

export async function requireAdminPageAccess() {
  const permission = await requireAdminAccess();

  if (!permission.ok) {
    redirect(permission.status === 401 ? "/login" : "/dashboard");
  }

  return permission.user;
}

export async function requirePermissionPageAccess(permissionKey: PermissionKey) {
  const permission = await requirePermission(permissionKey);

  if (!permission.ok) {
    redirect(permission.status === 401 ? "/login" : "/admin");
  }

  return permission.user;
}

export async function requireAllPermissionsPageAccess(permissionKeys: PermissionKey[]) {
  const permission = await requireAllPermissions(permissionKeys);

  if (!permission.ok) {
    redirect(permission.status === 401 ? "/login" : "/admin");
  }

  return permission.user;
}

export async function requireSuperAdminPageAccess() {
  const permission = await requireRole("SUPER_ADMIN");

  if (!permission.ok) {
    redirect(permission.status === 401 ? "/login" : "/admin");
  }

  return permission.user;
}
