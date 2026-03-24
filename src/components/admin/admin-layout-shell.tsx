"use client";

import { AdminFeatureIcon } from "@/components/admin/admin-icons";
import { AdminSessionProvider } from "@/components/admin/admin-session-provider";
import { ActionModal } from "@/components/ui/action-modal";
import { LoadingNavButton } from "@/components/loading-nav-button";
import { useTheme } from "@/components/theme-provider";
import { ADMIN_MAIN_NAV_ITEMS, ADMIN_MORE_ITEMS } from "@/lib/admin-navigation";
import { hasPermissionValue, isAdminRole, UserRole } from "@/lib/user-config";
import { capitalizeWords } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, TouchEvent, useRef, useState } from "react";

type AdminLayoutShellProps = {
  role: UserRole;
  permissions: string[];
  firstName?: string;
  children: ReactNode;
};

const PULL_REFRESH_TRIGGER = 84;
const PULL_REFRESH_MAX = 108;

export function AdminLayoutShell({ role, permissions, firstName, children }: AdminLayoutShellProps) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const pullStartYRef = useRef<number | null>(null);
  const isPullTrackingRef = useRef(false);
  const mainItems = ADMIN_MAIN_NAV_ITEMS.filter((item) => hasPermissionValue(role, permissions, item.permission));
  const moreItems = ADMIN_MORE_ITEMS.filter((item) => hasPermissionValue(role, permissions, item.permission));
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  const [isLeavingAdmin, setIsLeavingAdmin] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const canUsePullRefresh = pathname === "/admin";
  const contentTransform =
    canUsePullRefresh && (pullDistance > 0 || isPullRefreshing)
      ? `translateY(${pullDistance}px)`
      : undefined;

  async function refreshAdminFromPull() {
    if (!canUsePullRefresh || isPullRefreshing || confirmBackOpen || isLeavingAdmin) {
      setPullDistance(0);
      return;
    }

    setIsPullRefreshing(true);
    try {
      router.refresh();
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    } finally {
      setPullDistance(0);
      setIsPullRefreshing(false);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (!canUsePullRefresh || confirmBackOpen || isLeavingAdmin || isPullRefreshing || window.scrollY > 0) {
      pullStartYRef.current = null;
      isPullTrackingRef.current = false;
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    isPullTrackingRef.current = true;
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (
      !canUsePullRefresh ||
      !isPullTrackingRef.current ||
      pullStartYRef.current === null ||
      confirmBackOpen ||
      window.scrollY > 0
    ) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const delta = currentY - pullStartYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    setPullDistance(Math.min(PULL_REFRESH_MAX, delta * 0.45));
  }

  function handleTouchEnd() {
    pullStartYRef.current = null;
    isPullTrackingRef.current = false;

    if (canUsePullRefresh && pullDistance >= PULL_REFRESH_TRIGGER) {
      void refreshAdminFromPull();
      return;
    }

    setPullDistance(0);
  }

  const showPullRefresh = pullDistance > 0 || isPullRefreshing;

  return (
    <AdminSessionProvider value={{ role, permissions, firstName }}>
      <main
        className={[
          "admin-shell min-h-screen text-[#1F2937]",
          resolvedTheme === "dark"
            ? "bg-[linear-gradient(180deg,#0b1320_0%,#122031_100%)] text-slate-100"
            : "bg-[linear-gradient(180deg,#F8FAFA_0%,#EEF8F7_100%)]",
        ].join(" ")}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className={`pointer-events-none fixed left-1/2 top-4 z-30 transition-all duration-200 ${
            showPullRefresh ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translate(-50%, ${showPullRefresh ? Math.max(0, pullDistance + 44) : -80}px)`,
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#9FD6D5]/80 bg-white/95 text-[#1E8C8A] shadow-[0_14px_32px_rgba(31,41,55,0.14)] backdrop-blur">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#9FD6D5] bg-[#EAF9F8] ${
                isPullRefreshing ? "animate-spin" : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                <path d="M20 4v5h-5" />
              </svg>
            </span>
          </div>
        </div>

        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-24 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
          <header className="admin-shell-header sticky top-3 z-40 rounded-[30px] border border-[#9FD6D5]/70 bg-[linear-gradient(135deg,#2CA6A4_0%,#1E8C8A_100%)] px-4 py-5 text-white shadow-[0_20px_45px_rgba(31,41,55,0.16)] sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-white/75 uppercase">Bella Voce Admin</p>
                  <h1 className="font-display text-[2rem] leading-none sm:text-[2.4rem]">Control Panel</h1>
                  <p className="mt-2 text-sm text-white/80">
                  {isAdminRole(role)
                      ? `${capitalizeWords(firstName || "Admin")} signed in as ${role.replace("_", " ")}.`
                      : "Administrative access"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmBackOpen(true)}
                    className="admin-shell-back-button inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/12 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                  >
                    Back to Dashboard
                  </button>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-emerald-200">
                    <svg viewBox="0 0 24 24" className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m9 12 2 2 4-5" />
                      <path d="M12 3 5 6v6c0 4.4 2.9 8.5 7 9 4.1-.5 7-4.6 7-9V6l-7-3Z" />
                    </svg>
                    {role === "SUPER_ADMIN" ? "Full Access" : "Operational Admin"}
                  </span>
                </div>
              </div>

              <div className="hidden gap-2 overflow-x-auto md:flex">
                {[...mainItems, ...moreItems].map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <LoadingNavButton
                      key={item.href}
                      href={item.href}
                      disabled={isActive}
                      loadingText={`Opening ${item.label}...`}
                      className={`admin-shell-desktop-link shrink-0 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "cursor-default bg-white text-[#1E8C8A]"
                          : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {item.label}
                    </LoadingNavButton>
                  );
                })}
              </div>
            </div>
          </header>

          <section
            className="flex-1 py-4 transition-transform duration-200 ease-out"
            style={contentTransform ? { transform: contentTransform } : undefined}
          >
            {children}
          </section>
        </div>

        <nav
          className={[
            "admin-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-14px_30px_rgba(31,41,55,0.08)] backdrop-blur md:hidden",
            resolvedTheme === "dark"
              ? "border-[#9FD6D5]/40 bg-[#0b1320]/95"
              : "border-[#9FD6D5]/70 bg-white/95",
          ].join(" ")}
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
            {mainItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <LoadingNavButton
                  key={item.href}
                  href={item.href}
                  disabled={isActive}
                  loadingText={`Opening ${item.label}...`}
                  className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                    isActive
                      ? "admin-bottom-nav-active cursor-default bg-[#EAF9F8] text-[#1E8C8A]"
                      : "admin-bottom-nav-idle text-slate-500"
                  }`}
                >
                  <AdminFeatureIcon icon={item.icon} />
                  <span className="mt-1">{item.label}</span>
                </LoadingNavButton>
              );
            })}
          </div>
        </nav>

        <ActionModal
          open={confirmBackOpen}
          title="Return to Dashboard?"
          message="You are about to leave the admin control panel and go back to the main dashboard."
          confirmLabel="Back to Dashboard"
          isProcessing={isLeavingAdmin}
          onClose={() => setConfirmBackOpen(false)}
          onConfirm={() => {
            setIsLeavingAdmin(true);
            setConfirmBackOpen(false);
            router.push("/dashboard");
          }}
        />
      </main>
    </AdminSessionProvider>
  );
}
