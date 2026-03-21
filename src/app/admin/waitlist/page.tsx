import { WaitlistAdmin } from "@/components/admin/waitlist-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWaitlistPage() {
  await requirePermissionPageAccess("waitlist.view");
  return <WaitlistAdmin />;
}
