import { ComplaintForm } from "@/components/dashboard/complaint-form";
import { getAuthenticatedUser } from "@/lib/auth-session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ComplaintPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-4 py-6 sm:px-6">
      <section className="container-shell max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-[#1F2937]">Complaint</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Submit a private complaint to the Bella Voce administration team.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#9FD6D5] bg-white px-4 py-2 text-sm font-medium text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
          >
            Back
          </Link>
        </div>

        <ComplaintForm />
      </section>
    </main>
  );
}
