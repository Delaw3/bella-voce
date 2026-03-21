import { PaymentTransferPage } from "@/components/dashboard/payment-transfer-page";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPayTransferPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <PaymentTransferPage />;
}
