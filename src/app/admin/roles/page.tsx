import { RolesAdmin } from "@/components/admin/roles-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminRolesPage() {
  await requirePermissionPageAccess("roles_permissions.view");

  return <RolesAdmin />;
}
