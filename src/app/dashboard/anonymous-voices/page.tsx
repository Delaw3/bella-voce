import { AnonymousVoicesForm } from "@/components/voices/anonymous-voices-form";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Anonymous Voices | Bella Voce",
  description: "Share anonymous feedback, suggestions, and thoughts with the Bella Voce leadership team.",
};

export default async function AnonymousVoicesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <main className="dashboard-feature-page h-dvh overflow-x-clip overflow-y-auto bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-4 py-6 sm:px-6">
      <section className="container-shell mx-auto max-w-2xl space-y-4">
        <AnonymousVoicesForm
          statusUrl="/api/anonymous-voices/status"
          submitUrl="/api/anonymous-voices"
          showCloseButton
          privacyLead="Your member identity — name, email, member ID, and profile picture — is never recorded or linked to this message. Choir administrators can only review the text and the submission time."
        />
      </section>
    </main>
  );
}
