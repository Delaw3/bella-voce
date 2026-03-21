import { ChoirFinanceAdmin } from "@/components/admin/choir-finance-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminChoirFinancePage() {
  await requirePermissionPageAccess("choir_finance.view");
  return <ChoirFinanceAdmin />;
}
