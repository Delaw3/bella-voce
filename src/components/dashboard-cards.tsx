"use client";

import { formatChoirPost } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const cards = ["Attendance", "Fines", "Excuses", "Finance", "Profile"];

type DashboardCardsProps = {
  firstName?: string;
  posts?: string[];
};

export function DashboardCards({ firstName, posts }: DashboardCardsProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <section className="container-shell">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#1F2937] sm:text-4xl">
              Welcome{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Your Bella Voce dashboard is ready.
            </p>
            <p className="mt-1 text-sm text-[#1E8C8A]">
              Posts: {posts?.length ? posts.map((post) => formatChoirPost(post)).join(", ") : "Member"}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="w-full rounded-lg border border-[#9FD6D5] px-4 py-2 text-sm font-medium text-[#1E8C8A] transition hover:bg-[#EAF9F8] disabled:opacity-60 sm:w-auto"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card}
              className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_10px_24px_rgba(31,41,55,0.06)]"
            >
              <h2 className="text-lg font-semibold text-[#1F2937]">{card}</h2>
              <p className="mt-2 text-sm text-slate-600">Module coming soon.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
