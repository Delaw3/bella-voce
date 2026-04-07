"use client";

import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { capitalizeWords, formatInitials } from "@/lib/utils";
import { Bell, LockKeyhole, LogOut, Menu, Palette, PencilLine } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

type DashboardHeaderProps = {
  firstName?: string;
  choirLevel?: string;
  profilePicture?: string;
  unreadCount: number;
  onAvatarClick: () => void;
  onOpenNotifications: () => void;
  onOpenEditProfile: () => void;
  onOpenTheme: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
};

function HeaderActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/16 text-white shadow-[0_8px_20px_rgba(15,107,104,0.14)] backdrop-blur-md transition hover:bg-white/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      {children}
    </button>
  );
}

export function DashboardHeader({
  firstName,
  choirLevel,
  profilePicture,
  unreadCount,
  onAvatarClick,
  onOpenNotifications,
  onOpenEditProfile,
  onOpenTheme,
  onOpenChangePassword,
  onLogout,
  isLoggingOut = false,
}: DashboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = firstName ? capitalizeWords(firstName) : "User";
  const displayChoirLevel = choirLevel ? capitalizeWords(choirLevel) : "Member";
  return (
    <header className="relative overflow-visible rounded-[28px] border border-[#BFE5E1]/70 bg-[linear-gradient(135deg,#1F9D94_0%,#167F78_100%)] px-4 py-4 text-white shadow-[0_14px_36px_rgba(15,107,104,0.18)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/12 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-[#DDF4F2]/18 blur-2xl" />
        <div className="absolute inset-y-0 right-5 hidden w-24 rotate-12 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)] sm:block" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onAvatarClick}
          aria-label="Open profile details"
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start gap-3">
            <ProfileAvatar
              src={profilePicture}
              alt={`${displayName} profile`}
              initials={formatInitials(displayName)}
              size={52}
              className="h-[52px] w-[52px] border-2 border-white/35 shadow-[0_8px_18px_rgba(15,107,104,0.16)]"
              fallbackClassName="border-white/35 bg-white/18 text-white"
            />
            <div className="min-w-0 pt-1">
              <p className="text-[1.05rem] font-semibold leading-5 text-white">{displayName}</p>
              <span className="mt-1 inline-flex rounded-full border border-white/20 bg-white/14 px-2 py-0.5 text-[10px] font-medium leading-4 text-white/85">
                {displayChoirLevel}
              </span>
            </div>
          </div>
        </button>

        <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
          <HeaderActionButton label="Open notifications" onClick={onOpenNotifications}>
            <Bell className="h-5 w-5" strokeWidth={2} />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(239,68,68,0.35)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </HeaderActionButton>

          <HeaderActionButton label="Open menu" onClick={() => setIsMenuOpen((prev) => !prev)}>
            <Menu className="h-5 w-5" strokeWidth={2} />
          </HeaderActionButton>

          {isMenuOpen ? (
            <div className="dashboard-header-menu absolute right-0 top-14 z-20 w-52 rounded-[24px] border border-[#BFE5E1]/80 bg-white/97 p-2 text-[#1F2937] shadow-[0_20px_40px_rgba(15,107,104,0.14)] backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenEditProfile();
                }}
                className="dashboard-header-menu-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-[#EEF9F8]"
              >
                <span className="dashboard-header-menu-icon inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF9F8] text-[#0F6B68]">
                  <PencilLine className="h-4 w-4" />
                </span>
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenTheme();
                }}
                className="dashboard-header-menu-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-[#EEF9F8]"
              >
                <span className="dashboard-header-menu-icon inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF9F8] text-[#0F6B68]">
                  <Palette className="h-4 w-4" />
                </span>
                Change Theme
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenChangePassword();
                }}
                className="dashboard-header-menu-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-[#EEF9F8]"
              >
                <span className="dashboard-header-menu-icon inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF9F8] text-[#0F6B68]">
                  <LockKeyhole className="h-4 w-4" />
                </span>
                Change Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                disabled={isLoggingOut}
                className="dashboard-header-menu-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-70"
              >
                <span className="dashboard-header-menu-icon inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <LogOut className="h-4 w-4" />
                </span>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
