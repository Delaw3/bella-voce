"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type LoadingNavButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
};

export function LoadingNavButton({ href, children, className, disabled = false, loadingText = "Opening..." }: LoadingNavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const showLoading = isLoading && pathname !== href;

  function handleClick() {
    if (isLoading || disabled) return;
    setIsLoading(true);
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={showLoading || disabled} className={className}>
        {children}
      </button>

      {showLoading ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--color-bg)]/92 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 text-[#1E8C8A]">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#9FD6D5] border-t-[#1E8C8A]" />
            <p className="text-sm font-semibold">{loadingText}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
