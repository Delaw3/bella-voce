import { AccountabilityAdmin } from "@/components/admin/accountability-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminAccountabilityPage() {
  await requirePermissionPageAccess("accountability.view");
  return <AccountabilityAdmin />;
}
