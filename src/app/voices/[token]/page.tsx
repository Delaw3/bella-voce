import type { Metadata } from "next";
import { AnonymousVoicesForm } from "@/components/voices/anonymous-voices-form";

export const metadata: Metadata = {
  title: "Anonymous Voices | Bella Voce",
  description: "Share anonymous feedback, suggestions, and thoughts with the Bella Voce leadership team.",
  robots: { index: false, follow: false },
};

export default async function PublicVoicesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)] px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-2xl space-y-4">
        <AnonymousVoicesForm
          statusUrl={`/api/voices/${token}/status`}
          submitUrl={`/api/voices/${token}`}
          privacyLead="Your identity — name, email, and profile picture — is never recorded or linked to this message. Only the text and the submission time are visible to administrators."
        />
        <p className="pb-8 text-center text-xs text-slate-400">Bella Voce • Anonymous Voices</p>
      </section>
    </main>
  );
}
