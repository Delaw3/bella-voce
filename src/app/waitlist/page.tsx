import { WaitlistForm } from "@/components/waitlist-form";
import { LoadingNavButton } from "@/components/loading-nav-button";

export default function WaitlistPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="pb-16 sm:pb-24">
        <section className="container-shell pt-12 sm:pt-16">
          <div className="mx-auto max-w-xl px-2 py-2 sm:px-4 sm:py-4">
            <h1 className="font-display text-center text-3xl font-semibold text-bv-text sm:text-4xl">
              Join the Waitlist
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600 sm:text-base">
              Submit your details to reserve your registration ID for Bella Voce.
            </p>
            <div className="mt-6">
              <WaitlistForm />
            </div>
            <div className="mt-6 text-center">
              <LoadingNavButton
                href="/"
                className="text-sm font-medium text-[#1E8C8A] underline decoration-[#1E8C8A]/35 underline-offset-2 transition hover:text-[#2CA6A4]"
              >
                Back to Home
              </LoadingNavButton>
            </div>
          </div>
        </section>
      </div>
      <footer className="mt-auto pb-6 text-center text-xs text-slate-500 sm:pb-8 sm:text-sm">
        Powered by{" "}
        <a
          href="https://dexarptech.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1E8C8A] underline decoration-[#1E8C8A]/35 underline-offset-2 transition hover:text-[#2CA6A4]"
        >
          Dexarptech.com
        </a>
      </footer>
    </main>
  );
}
