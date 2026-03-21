import { SongSelectionDetails } from "@/components/dashboard/song-selection-details";
import { getAuthenticatedUser } from "@/lib/auth-session";
import Link from "next/link";
import { redirect } from "next/navigation";

type SongSelectionDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongSelectionDetailsPage({ params }: SongSelectionDetailsPageProps) {
  const user = await getAuthenticatedUser();
  const { id } = await params;

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-6 sm:px-6">
      <section className="container-shell max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-[#1F2937]">Song Selection Details</h1>
          <Link
            href="/dashboard/song-selections"
            className="rounded-xl border border-[#9FD6D5] bg-white px-4 py-2 text-sm font-medium text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
          >
            Back
          </Link>
        </div>

        <SongSelectionDetails id={id} />
      </section>
    </main>
  );
}
