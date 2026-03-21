import { ComplaintsAdmin } from "@/components/admin/complaints-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminComplaintsPage() {
  await requirePermissionPageAccess("complaints.view");
  return <ComplaintsAdmin />;
}
