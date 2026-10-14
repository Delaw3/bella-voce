import { PsalmistScheduleList } from "@/components/dashboard/psalmist-schedule-list";
import { getAuthenticatedUser } from "@/lib/auth-session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PsalmistPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <main className="dashboard-feature-page h-dvh overflow-x-clip overflow-y-auto bg-[var(--color-bg)] px-4 py-6 sm:px-6">
      <section className="container-shell max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl text-[#1F2937]">Psalmist</h1>
            <p className="mt-1 line-clamp-1 text-xs text-slate-600">Monthly schedule & members.</p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-xl border border-[#9FD6D5] bg-white px-3 py-2 text-xs font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
          >
            Back
          </Link>
        </div>

        <PsalmistScheduleList />
      </section>
    </main>
  );
}
