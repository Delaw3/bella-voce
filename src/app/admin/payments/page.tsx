import { PaymentsAdmin } from "@/components/admin/payments-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminPaymentsPage() {
  await requirePermissionPageAccess("payments.view");
  return <PaymentsAdmin />;
}
