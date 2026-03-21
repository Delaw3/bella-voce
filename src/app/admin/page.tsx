import { AdminFeatureIcon, AdminIconName } from "@/components/admin/admin-icons";
import { LoadingNavButton } from "@/components/loading-nav-button";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard";
import { requirePermissionPageAccess } from "@/lib/access-control";
import { hasPermissionValue, resolvePermissions } from "@/lib/user-config";

const adminCards = [
  { href: "/admin/members", label: "Members", icon: "members" as AdminIconName, description: "Search members, update posts, and manage profiles." },
  { href: "/admin/accountability", label: "Accountability", icon: "accountability" as AdminIconName, description: "Review dynamic totals and edit pledged, fine, and levy adjustments." },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" as AdminIconName, description: "Review debt leaders, attendance totals, and monthly dues health." },
  { href: "/admin/settings", label: "Settings", icon: "settings" as AdminIconName, description: "Set the global monthly dues, lateness fee, and absent fee amounts." },
  { href: "/admin/attendance", label: "Attendance", icon: "attendance" as AdminIconName, description: "Mark members present, late, or absent for each day." },
  { href: "/admin/monthly-dues", label: "Monthly Dues", icon: "monthly-dues" as AdminIconName, description: "Mark each month paid or unpaid per member." },
  { href: "/admin/payments", label: "Payments", icon: "payments" as AdminIconName, description: "Approve user transfer submissions and record manual settlements." },
  { href: "/admin/payment-accounts", label: "Payment Accounts", icon: "payment-accounts" as AdminIconName, description: "Manage the bank accounts members should transfer into." },
  { href: "/admin/probation-members", label: "Probation Members", icon: "probation-members" as AdminIconName, description: "Review probation members and their attendance record." },
  { href: "/admin/waitlist", label: "Waitlist", icon: "waitlist" as AdminIconName, description: "Review waitlist signups and see who has completed registration." },
  { href: "/admin/excuses", label: "Excuses", icon: "excuses" as AdminIconName, description: "Review submitted excuses and respond with status updates." },
  { href: "/admin/choir-finance", label: "Choir Finance", icon: "finance" as AdminIconName, description: "Track income, expenses, and current balance." },
  { href: "/admin/song-selections", label: "Song Selections", icon: "song-selections" as AdminIconName, description: "Create and edit song lists for rehearsals and services." },
  { href: "/admin/notifications", label: "Notifications", icon: "notifications" as AdminIconName, description: "Send announcements to one user, a role, or everyone." },
  { href: "/admin/complaints", label: "Complaints", icon: "complaints" as AdminIconName, description: "Review submitted complaints and resolve them properly." },
  { href: "/admin/roles", label: "Roles / Access", icon: "roles" as AdminIconName, description: "Super admin only. Promote, demote, and govern access." },
] as const;

export default async function AdminHomePage() {
  const user = await requirePermissionPageAccess("dashboard_admin.view");
  const permissions = resolvePermissions(user.role, user.permissions);
  const {
    memberCount,
    adminCount,
    complaintCount,
    excusePendingCount,
    selectionCount,
    notificationCount,
    incomeTotal,
    expenseTotal,
  } = await getAdminDashboardSummary();

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Members", value: memberCount },
          { label: "Admins", value: adminCount },
          { label: "Open Complaints", value: complaintCount },
          { label: "Pending Excuses", value: excusePendingCount },
        ].map((item) => (
          <article
            key={item.label}
            className="admin-surface-card rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">{item.label}</p>
            <p className="admin-surface-title mt-3 font-display text-4xl text-[#1F2937]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="admin-surface-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-surface-title font-display text-2xl text-[#1F2937]">Admin Features</h2>
              <p className="admin-surface-copy mt-1 text-sm text-slate-600">Choose a section to manage Bella Voce operations.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {adminCards
              .filter((card) =>
                card.href === "/admin/members"
                  ? hasPermissionValue(user.role, permissions, "members.view")
                  : card.href === "/admin/accountability"
                    ? hasPermissionValue(user.role, permissions, "accountability.view")
                    : card.href === "/admin/analytics"
                      ? hasPermissionValue(user.role, permissions, "analytics.view")
                      : card.href === "/admin/settings"
                        ? hasPermissionValue(user.role, permissions, "settings.view")
                        : card.href === "/admin/attendance"
                          ? hasPermissionValue(user.role, permissions, "attendance.view")
                          : card.href === "/admin/monthly-dues"
                            ? hasPermissionValue(user.role, permissions, "monthly_dues.view")
                            : card.href === "/admin/payments"
                              ? hasPermissionValue(user.role, permissions, "payments.view")
                              : card.href === "/admin/payment-accounts"
                                ? hasPermissionValue(user.role, permissions, "payment_accounts.view")
                                : card.href === "/admin/probation-members"
                                  ? hasPermissionValue(user.role, permissions, "probation_members.view")
                                  : card.href === "/admin/waitlist"
                                    ? hasPermissionValue(user.role, permissions, "waitlist.view")
                                    : card.href === "/admin/excuses"
                                      ? hasPermissionValue(user.role, permissions, "excuses.view")
                                      : card.href === "/admin/choir-finance"
                                        ? hasPermissionValue(user.role, permissions, "choir_finance.view")
                                        : card.href === "/admin/song-selections"
                                          ? hasPermissionValue(user.role, permissions, "song_selections.view")
                                          : card.href === "/admin/notifications"
                                            ? hasPermissionValue(user.role, permissions, "notifications.view")
                                            : card.href === "/admin/complaints"
                                              ? hasPermissionValue(user.role, permissions, "complaints.view")
                                              : hasPermissionValue(user.role, permissions, "roles_permissions.view"),
              )
              .map((card) => (
                <LoadingNavButton
                  key={card.href}
                  href={card.href}
                  loadingText={`Opening ${card.label}...`}
                  className="admin-feature-card aspect-square rounded-[24px] border border-[#9FD6D5]/70 bg-[#F8FAFA] p-4 shadow-[0_10px_24px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 hover:border-[#2CA6A4]"
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="admin-feature-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
                      <AdminFeatureIcon icon={card.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="admin-feature-title text-sm font-semibold text-[#1F2937]">{card.label}</p>
                      <p className="admin-surface-copy mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
                    </div>
                  </div>
                </LoadingNavButton>
              ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="admin-surface-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
            <h2 className="admin-surface-title font-display text-2xl text-[#1F2937]">Finance Snapshot</h2>
            <div className="mt-4 grid gap-3">
              <div className="admin-finance-highlight rounded-2xl bg-[#EAF9F8] px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.1em] text-[#1E8C8A] uppercase">Total Income</p>
                <p className="admin-surface-title mt-2 text-2xl font-semibold text-[#1F2937]">₦ {incomeTotal.toLocaleString()}</p>
              </div>
              <div className="admin-finance-card rounded-2xl bg-[#F8FAFA] px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.1em] text-[#1E8C8A] uppercase">Total Expenses</p>
                <p className="admin-surface-title mt-2 text-2xl font-semibold text-[#1F2937]">₦ {expenseTotal.toLocaleString()}</p>
              </div>
              <div className="admin-finance-card rounded-2xl border border-[#9FD6D5] px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.1em] text-[#1E8C8A] uppercase">Current Balance</p>
                <p className="admin-surface-title mt-2 text-2xl font-semibold text-[#1F2937]">
                  ₦ {(incomeTotal - expenseTotal).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <section className="admin-surface-card rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
            <h2 className="admin-surface-title font-display text-2xl text-[#1F2937]">Activity</h2>
            <ul className="admin-surface-copy mt-4 space-y-3 text-sm text-slate-600">
              <li>{selectionCount} song selections available to members.</li>
              <li>{notificationCount} notifications created so far.</li>
              <li>Use the navigation above to manage each admin workflow.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
