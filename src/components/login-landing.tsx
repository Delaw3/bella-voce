import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { PwaInstallCta } from "@/components/pwa-install-cta";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export async function LoginLanding() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <AuthShell title="Login" subtitle="Access your Bella Voce member account.">
      <LoginForm />
      <PwaInstallCta />
    </AuthShell>
  );
}
