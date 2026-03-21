import { PaymentAccountsAdmin } from "@/components/admin/payment-accounts-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminPaymentAccountsPage() {
  await requirePermissionPageAccess("payment_accounts.view");
  return <PaymentAccountsAdmin />;
}
