"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type AppLoaderProps = {
  children: React.ReactNode;
};

export function AppLoader({ children }: AppLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <div
        aria-hidden={!isLoading}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFA] transition-opacity duration-500 ${
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
          <div className="flex items-center gap-3">
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
        </div>
      </div>

      <div className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>
        {children}
      </div>
    </>
  );
}
