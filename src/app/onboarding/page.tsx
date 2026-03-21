import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/onboarding-form";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Onboarding"
      subtitle="Complete your choir profile so we can prepare your Bella Voce dashboard."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
