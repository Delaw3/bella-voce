"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LoadingNavButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function LoadingNavButton({ href, children, className }: LoadingNavButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleClick() {
    if (isLoading) return;
    setIsLoading(true);
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isLoading} className={className}>
        {children}
      </button>

      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/95">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#9FD6D5] border-t-[#1E8C8A]" />
        </div>
      ) : null}
    </>
  );
}
