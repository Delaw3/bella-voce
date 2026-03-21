import Image from "next/image";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#9FD6D5]/70 bg-white px-5 py-6 shadow-[0_12px_28px_rgba(31,41,55,0.08)] sm:px-7 sm:py-8">
        <div className="mb-3 flex justify-center">
          <Image
            src="/images/bella-voce-logo.png"
            alt="Bella Voce"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-contain"
            priority
          />
        </div>
        <h1 className="font-display text-center text-3xl font-semibold text-[#1F2937]">{title}</h1>
        <p className="mt-2 text-center text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
