import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Suspense } from "react";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email to receive an OTP and reset your password."
    >
      <Suspense fallback={<div className="text-sm text-slate-600">Loading reset flow...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
