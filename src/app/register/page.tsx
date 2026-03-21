import { AuthShell } from "@/components/auth-shell";
import { RegisterFlowForm } from "@/components/register-flow-form";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <AuthShell
      title="Register"
      subtitle="Create your Bella Voce account."
    >
      <RegisterFlowForm />
    </AuthShell>
  );
}
