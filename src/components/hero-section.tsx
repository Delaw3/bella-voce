import Image from "next/image";

export function HeroSection() {
  return (
    <section className="container-shell pt-12 pb-0 sm:pt-16 sm:pb-0">
      <div className="mx-auto max-w-3xl px-2 py-2 text-center sm:px-4 sm:py-4">
        <Image
          src="/images/bella-voce-logo.png"
          alt="Bella Voce logo"
          width={120}
          height={34}
          className="mx-auto h-auto w-auto max-w-[120px]"
          priority
        />
        <h1 className="font-display mt-5 text-4xl leading-tight font-semibold text-bv-text sm:text-5xl">
          Bella Voce App
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-bv-accent sm:text-lg">
          Choir accountability, attendance tracking, member onboarding, and management in one calm,
          unified space.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Bella Voce App helps your choir stay organized, connected, and ready to serve each week.
        </p>
      </div>
    </section>
  );
}
