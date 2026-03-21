"use client";

import Image from "next/image";
import { capitalizeWords } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
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
    <header className="rounded-2xl border border-[#9FD6D5]/70 bg-[#2CA6A4] px-4 py-3 shadow-[0_12px_30px_rgba(31,41,55,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label="Open profile details"
            className="rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CA6A4]/50"
          >
            {profilePicture ? (
              <Image
                src={profilePicture}
                alt={`${displayName} profile`}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.8-3.2 4.6-5 8-5s6.2 1.8 8 5" />
                </svg>
              </div>
            )}
          </button>
          <div>
            <p className="font-display text-xl text-white">{displayName}</p>
            <p className="text-xs text-white/80">{displayChoirLevel}</p>
          </div>
        </div>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative rounded-xl border border-white/30 bg-white/15 p-2 text-white transition hover:bg-white/25"
            aria-label="Open notifications"
          >
            <BellIcon />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="rounded-xl border border-white/30 bg-white/15 p-2 text-white transition hover:bg-white/25"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          {isMenuOpen ? (
            <div className="absolute top-12 right-0 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenEditProfile();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#1F2937] transition hover:bg-[#EAF9F8]"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenTheme();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#1F2937] transition hover:bg-[#EAF9F8]"
              >
                Change Theme
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenChangePassword();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#1F2937] transition hover:bg-[#EAF9F8]"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                disabled={isLoggingOut}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-70"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
