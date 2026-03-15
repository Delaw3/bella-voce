import { HeroSection } from "@/components/hero-section";
import { LoadingNavButton } from "@/components/loading-nav-button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="pb-16 sm:pb-24">
        <HeroSection />
        <section className="container-shell mt-10 sm:mt-12">
          <div className="mx-auto max-w-2xl px-2 text-center sm:px-4">
            <p className="text-sm text-slate-600 sm:text-base">
              Click the button bellow to fill the waitlist form.
            </p>
            <LoadingNavButton
              href="/waitlist"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] hover:shadow-[0_10px_24px_rgba(30,140,138,0.35)]"
            >
              Open Waitlist Form
            </LoadingNavButton>
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
