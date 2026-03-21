import { MonthlyDuesAdmin } from "@/components/admin/monthly-dues-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminMonthlyDuesPage() {
  await requirePermissionPageAccess("monthly_dues.view");
  return <MonthlyDuesAdmin />;
}
