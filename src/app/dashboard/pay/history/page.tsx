import { PaymentHistoryPage } from "@/components/dashboard/payment-history-page";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPayHistoryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <PaymentHistoryPage />;
}
