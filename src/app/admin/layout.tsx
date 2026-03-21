import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { requireAdminPageAccess } from "@/lib/access-control";
import { resolvePermissions } from "@/lib/user-config";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPageAccess();

  return (
    <AdminLayoutShell
      role={user.role}
      permissions={resolvePermissions(user.role, user.permissions)}
      firstName={user.firstName}
    >
      {children}
    </AdminLayoutShell>
  );
}
