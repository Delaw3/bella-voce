import { ExcusesAdmin } from "@/components/admin/excuses-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminExcusesPage() {
  await requirePermissionPageAccess("excuses.view");
  return <ExcusesAdmin />;
}
