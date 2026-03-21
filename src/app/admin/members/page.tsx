import { MembersAdmin } from "@/components/admin/members-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminMembersPage() {
  const user = await requirePermissionPageAccess("members.view");

  return <MembersAdmin currentRole={user.role} />;
}
