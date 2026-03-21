import { ProbationMembersAdmin } from "@/components/admin/probation-members-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProbationMembersPage() {
  await requirePermissionPageAccess("probation_members.view");
  return <ProbationMembersAdmin />;
}
