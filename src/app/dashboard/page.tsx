import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <UserDashboard firstName={user.firstName} role={user.role} />;
}
