export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "USER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const CHOIR_POSTS = [
  "President",
  "Vice President",
  "Secretary",
  "Assistant Secretary",
  "Financial Secretary / Treasurer",
  "Provost 1",
  "Provost 2",
  "PRO",
  "Curator 1",
  "Curator 2",
  "Choirmaster",
  "Assistant Choirmaster",
  "Auxiliary Choirmaster",
  "Organist",
] as const;
export type ChoirPost = (typeof CHOIR_POSTS)[number];

export const PERMISSION_GROUPS = {
  dashboard_admin: ["view"],
  members: ["view", "edit", "delete"],
  accountability: ["view", "edit"],
  accountability_items: ["view", "edit", "delete"],
  attendance: ["view", "mark", "delete"],
  monthly_dues: ["view", "mark_paid"],
  settings: ["view", "edit"],
  choir_finance: ["view", "create", "edit", "delete"],
  song_selections: ["view", "create", "edit", "delete"],
  psalmist: ["view", "create", "edit", "delete"],
  notifications: ["view", "create", "delete"],
  complaints: ["view", "edit", "delete"],
  excuses: ["view", "edit", "delete"],
  probation_members: ["view"],
  waitlist: ["view", "create"],
  analytics: ["view"],
  reminders: ["trigger"],
  payments: ["view", "create", "edit", "approve", "delete"],
  payment_accounts: ["view", "create", "edit", "delete"],
  reports: ["export"],
  audit_logs: ["view"],
  push_notifications: ["send"],
  roles_permissions: ["view", "edit"],
} as const;

type PermissionFeature = keyof typeof PERMISSION_GROUPS;
type PermissionAction<F extends PermissionFeature> = (typeof PERMISSION_GROUPS)[F][number];

export type PermissionKey = {
  [F in PermissionFeature]: `${F}.${PermissionAction<F>}`;
}[PermissionFeature];

export const ALL_PERMISSIONS = Object.entries(PERMISSION_GROUPS).flatMap(([feature, actions]) =>
  actions.map((action) => `${feature}.${action}` as PermissionKey),
) as PermissionKey[];

export const PERMISSION_LABELS: Record<PermissionFeature, string> = {
  dashboard_admin: "Admin Dashboard",
  members: "Members",
  accountability: "Accountability",
  accountability_items: "Accountability Items",
  attendance: "Attendance",
  monthly_dues: "Monthly Dues",
  settings: "Settings",
  choir_finance: "Choir Finance",
  song_selections: "Song Selections",
  psalmist: "Psalmist",
  notifications: "Notifications",
  complaints: "Complaints",
  excuses: "Excuses",
  probation_members: "Probation Members",
  waitlist: "Waitlist",
  analytics: "Analytics",
  reminders: "Reminders",
  payments: "Payments",
  payment_accounts: "Payment Accounts",
  reports: "Reports",
  audit_logs: "Audit Logs",
  push_notifications: "Push Notifications",
  roles_permissions: "Roles & Permissions",
};

export const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  USER: [],
  ADMIN: ["dashboard_admin.view"],
  SUPER_ADMIN: ALL_PERMISSIONS,
};

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function normalizePermissions(input?: string[] | null): PermissionKey[] {
  if (!input?.length) return [];
  return input.filter((permission): permission is PermissionKey =>
    ALL_PERMISSIONS.includes(permission as PermissionKey),
  );
}

export function resolvePermissions(role: UserRole, customPermissions?: string[] | null): PermissionKey[] {
  if (role === "SUPER_ADMIN") {
    return [...ALL_PERMISSIONS];
  }

  if (role !== "ADMIN") {
    return [];
  }

  const permissions = new Set<PermissionKey>(DEFAULT_ROLE_PERMISSIONS[role] ?? []);
  for (const permission of normalizePermissions(customPermissions)) {
    permissions.add(permission);
  }

  return [...permissions];
}

export function sanitizePermissionsForRole(role: UserRole, customPermissions?: string[] | null): PermissionKey[] {
  if (role === "SUPER_ADMIN") {
    return [...ALL_PERMISSIONS];
  }

  if (role !== "ADMIN") {
    return [];
  }

  return normalizePermissions(customPermissions);
}

export function canRoleHoldPermissions(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function hasPermissionValue(
  role: UserRole,
  customPermissions: string[] | null | undefined,
  permission: PermissionKey,
): boolean {
  return resolvePermissions(role, customPermissions).includes(permission);
}

export function hasAnyPermissionValue(
  role: UserRole,
  customPermissions: string[] | null | undefined,
  permissions: PermissionKey[],
): boolean {
  const resolved = resolvePermissions(role, customPermissions);
  return permissions.some((permission) => resolved.includes(permission));
}
