"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";

type AppLoaderProps = {
  children: ReactNode;
};

export function AppLoader({ children }: AppLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Shorter splash: just enough to flash the brand without feeling like a hang.
    // `pagehide`/`pageshow` guards against the timer being throttled on mobile
    // bfcache restores, which previously could leave the overlay stuck open.
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 700);

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setIsLoading(false);
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden={!isLoading}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] transition-opacity duration-300 ${
          isLoading ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-4 text-[#1E8C8A]">
          <Image
            src="/images/bella-voce-logo.png"
            alt="Bella Voce logo"
            width={120}
            height={34}
            className="loader-logo h-auto w-auto max-w-30"
            priority
          />
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="music-note" style={{ animationDelay: "0ms" }}>
              ♪
            </span>
            <span className="music-note" style={{ animationDelay: "140ms" }}>
              ♫
            </span>
            <span className="music-note" style={{ animationDelay: "280ms" }}>
              ♬
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-xs font-medium tracking-[0.08em] text-[#5B6575]">Powered by</p>
            <p className="text-sm font-semibold tracking-[0.08em] text-[#1F9D94]">Dexarptech</p>
          </div>
        </div>
      </div>

      <div className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>{children}</div>
    </>
  );
}
