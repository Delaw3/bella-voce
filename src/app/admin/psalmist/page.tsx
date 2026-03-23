import { PsalmistAdmin } from "@/components/admin/psalmist-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminPsalmistPage() {
  await requirePermissionPageAccess("psalmist.view");
  return <PsalmistAdmin />;
}
