import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFeatureIcon } from "@/components/admin/admin-icons";
import { LoadingNavButton } from "@/components/loading-nav-button";
import { ADMIN_MORE_ITEMS } from "@/lib/admin-navigation";
import { requirePermissionPageAccess } from "@/lib/access-control";
import { hasPermissionValue, resolvePermissions } from "@/lib/user-config";

export default async function AdminMorePage() {
  const user = await requirePermissionPageAccess("dashboard_admin.view");
  const permissions = resolvePermissions(user.role, user.permissions);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="More Tools"
        description="Less frequent admin tools are grouped here to keep the main control panel cleaner and more app-like."
        badge="Admin Navigation"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_MORE_ITEMS.filter((item) => hasPermissionValue(user.role, permissions, item.permission)).map((item) => (
          <LoadingNavButton
            key={item.href}
            href={item.href}
            loadingText={`Opening ${item.label}...`}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_12px_28px_rgba(31,41,55,0.06)] transition hover:-translate-y-0.5 hover:border-[#2CA6A4]"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
              <AdminFeatureIcon icon={item.icon} className="h-5 w-5" />
            </span>
            <p className="text-lg font-semibold text-[#1F2937]">{item.label}</p>
            <p className="mt-2 text-sm text-slate-600">Open the {item.label.toLowerCase()} tools.</p>
          </LoadingNavButton>
        ))}
      </section>
    </div>
  );
}
