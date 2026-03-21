import { PaymentHistoryDetailsPage } from "@/components/dashboard/payment-history-details-page";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPayHistoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  return <PaymentHistoryDetailsPage transactionId={id} />;
}
