import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email and we will guide you through the next steps."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
