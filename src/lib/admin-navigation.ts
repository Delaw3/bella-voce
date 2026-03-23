import { PermissionKey } from "@/lib/user-config";

export const ADMIN_MAIN_NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: "home", permission: "dashboard_admin.view" as PermissionKey },
  { href: "/admin/members", label: "Members", icon: "members", permission: "members.view" as PermissionKey },
  {
    href: "/admin/choir-finance",
    label: "Finance",
    icon: "finance",
    permission: "choir_finance.view" as PermissionKey,
  },
  {
    href: "/admin/notifications",
    label: "Alerts",
    icon: "notifications",
    permission: "notifications.view" as PermissionKey,
  },
  { href: "/admin/more", label: "More", icon: "more", permission: "dashboard_admin.view" as PermissionKey },
] as const;

export const ADMIN_MORE_ITEMS = [
  { href: "/admin/analytics", label: "Analytics", icon: "analytics", permission: "analytics.view" as PermissionKey },
  { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings.view" as PermissionKey },
  { href: "/admin/attendance", label: "Attendance", icon: "attendance", permission: "attendance.view" as PermissionKey },
  { href: "/admin/monthly-dues", label: "Monthly Dues", icon: "monthly-dues", permission: "monthly_dues.view" as PermissionKey },
  { href: "/admin/song-selections", label: "Song Selections", icon: "song-selections", permission: "song_selections.view" as PermissionKey },
  { href: "/admin/psalmist", label: "Psalmist", icon: "psalmist", permission: "psalmist.view" as PermissionKey },
  { href: "/admin/complaints", label: "Complaints", icon: "complaints", permission: "complaints.view" as PermissionKey },
  { href: "/admin/excuses", label: "Excuses", icon: "excuses", permission: "excuses.view" as PermissionKey },
  {
    href: "/admin/probation-members",
    label: "Probation Members",
    icon: "probation-members",
    permission: "probation_members.view" as PermissionKey,
  },
  { href: "/admin/waitlist", label: "Waitlist", icon: "waitlist", permission: "waitlist.view" as PermissionKey },
  { href: "/admin/accountability", label: "Accountability", icon: "accountability", permission: "accountability.view" as PermissionKey },
  { href: "/admin/payments", label: "Payments", icon: "payments", permission: "payments.view" as PermissionKey },
  {
    href: "/admin/payment-accounts",
    label: "Payment Accounts",
    icon: "payment-accounts",
    permission: "payment_accounts.view" as PermissionKey,
  },
  { href: "/admin/roles", label: "Roles & Permissions", icon: "roles", permission: "roles_permissions.view" as PermissionKey },
] as const;
