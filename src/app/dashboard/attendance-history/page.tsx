import { AttendanceHistoryView } from "@/components/dashboard/attendance-history-view";
import { getAuthenticatedUser } from "@/lib/auth-session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AttendanceHistoryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <main className="h-screen overflow-x-clip overflow-y-auto bg-[var(--color-bg)] px-4 py-6 sm:px-6">
      <section className="container-shell max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-[#1F2937]">Attendance History</h1>
            <p className="mt-1 text-sm text-slate-600">Review your attendance records with list and calendar views.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#9FD6D5] bg-white px-4 py-2 text-sm font-medium text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
          >
            Back
          </Link>
        </div>

        <AttendanceHistoryView />
      </section>
    </main>
  );
}
