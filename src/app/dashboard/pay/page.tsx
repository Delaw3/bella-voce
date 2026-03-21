import { PaymentsPage } from "@/components/dashboard/payments-page";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPayPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <PaymentsPage />;
}
