"use client";

import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { ChangeThemeForm } from "@/components/dashboard/change-theme-form";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardMorePanel } from "@/components/dashboard/dashboard-more-panel";
import {
  DashboardQuickAccess,
  QuickAccessCustomizer,
  QuickAccessKey,
} from "@/components/dashboard/dashboard-quick-access";
import { DashboardSheet } from "@/components/dashboard/dashboard-sheet";
import { EditProfileForm } from "@/components/dashboard/edit-profile-form";
import { ExcusePanel } from "@/components/dashboard/excuse-panel";
import { DashboardFeatureKey, FeatureGrid } from "@/components/dashboard/feature-grid";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { MembersPanel } from "@/components/dashboard/members-panel";
import { MonthlyDuesPanel } from "@/components/dashboard/monthly-dues-panel";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { ProfilePanel } from "@/components/dashboard/profile-panel";
import { TotalOwedCard } from "@/components/dashboard/total-owed-card";
import { ActionModal } from "@/components/ui/action-modal";
import {
  DebtDetailBreakdown,
  DashboardSummaryResponse,
  ExcuseItem,
  MemberItem,
  MonthlyDueItem,
  NotificationItem,
  ProfileInfo,
} from "@/types/dashboard";
import { useRouter } from "next/navigation";
import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";

type UserDashboardProps = {
  firstName?: string;
  role?: string;
};

const defaultSummary: DashboardSummaryResponse = {
  debt: {
    monthlyDues: 0,
    absentFee: 0,
    latenessFee: 0,
    pledged: 0,
    fine: 0,
    levy: 0,
    totalOwed: 0,
  },
  debtDetails: {
    monthlyDues: [],
    absentFee: [],
    latenessFee: [],
    pledged: [],
    fine: [],
    levy: [],
  },
  notifications: [],
  activeAlert: null,
  unreadNotificationCount: 0,
  excusePreview: [],
  monthlyDuesPreview: [],
};

const QUICK_ACCESS_STORAGE_KEY = "bella-voce.quick-access";
const defaultQuickAccess: QuickAccessKey[] = [
  "pay",
  "payment-history",
  "monthly-dues",
  "notifications",
  "attendance-history",
  "members",
];
const PULL_REFRESH_TRIGGER = 84;
const PULL_REFRESH_MAX = 108;

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T & { message?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T & { message?: string };
  }

  const responseText = await response.text();
  return {
    message: responseText.includes("<!DOCTYPE") ? fallbackMessage : responseText || fallbackMessage,
  } as T & { message?: string };
}

type ActiveSheet =
  | "notifications"
  | "profile"
  | "edit-profile"
  | "change-theme"
  | "change-password"
  | "owed-details"
  | "excuses"
  | "monthly-dues"
  | "members"
  | "excos"
  | "more"
  | "quick-access"
  | null;

export function UserDashboard({ firstName, role }: UserDashboardProps) {
  const router = useRouter();
  const pullStartYRef = useRef<number | null>(null);
  const isPullTrackingRef = useRef(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse>(defaultSummary);
  const [activeAlert, setActiveAlert] = useState<NotificationItem | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [excuses, setExcuses] = useState<ExcuseItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [dues, setDues] = useState<MonthlyDueItem[]>([]);
  const [duesYear, setDuesYear] = useState(new Date().getFullYear());
  const [duesAvailableYears, setDuesAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [quickAccess, setQuickAccess] = useState<QuickAccessKey[]>(defaultQuickAccess);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const unresolvedFirstName = firstName || profile?.firstName || "";

  async function loadDashboard(options?: { showLoading?: boolean }) {
    const showLoading = options?.showLoading ?? true;
    setError(null);
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const [summaryRes, notificationsRes, excusesRes, membersRes, duesRes, profileRes] = await Promise.all([
        fetch("/api/dashboard/summary"),
        fetch("/api/notifications"),
        fetch("/api/excuses"),
        fetch("/api/members"),
        fetch("/api/monthly-dues"),
        fetch("/api/profile"),
      ]);

      const [summaryPayload, notificationsPayload, excusesPayload, membersPayload, duesPayload, profilePayload] =
        (await Promise.all([
          readJsonResponse<DashboardSummaryResponse>(summaryRes, "Unable to load dashboard summary."),
          readJsonResponse<{ notifications?: NotificationItem[]; unreadCount?: number }>(
            notificationsRes,
            "Unable to load notifications.",
          ),
          readJsonResponse<{ excuses?: ExcuseItem[] }>(excusesRes, "Unable to load excuses."),
          readJsonResponse<{ members?: MemberItem[] }>(membersRes, "Unable to load members."),
          readJsonResponse<{ months?: MonthlyDueItem[]; year?: number; availableYears?: number[] }>(
            duesRes,
            "Unable to load monthly dues.",
          ),
          readJsonResponse<{ profile?: ProfileInfo }>(profileRes, "Unable to load profile."),
        ])) as [
          DashboardSummaryResponse & { message?: string },
          { notifications?: NotificationItem[]; unreadCount?: number; message?: string },
          { excuses?: ExcuseItem[]; message?: string },
          { members?: MemberItem[]; message?: string },
          { months?: MonthlyDueItem[]; year?: number; availableYears?: number[]; message?: string },
          { profile?: ProfileInfo; message?: string },
        ];

      if (!summaryRes.ok) {
        throw new Error(summaryPayload.message ?? "Unable to load dashboard.");
      }

      setSummary({
        debt: summaryPayload.debt ?? defaultSummary.debt,
        debtDetails: summaryPayload.debtDetails ?? defaultSummary.debtDetails,
        notifications: summaryPayload.notifications ?? [],
        activeAlert: summaryPayload.activeAlert ?? null,
        unreadNotificationCount: Number(summaryPayload.unreadNotificationCount || 0),
        excusePreview: summaryPayload.excusePreview ?? [],
        monthlyDuesPreview: summaryPayload.monthlyDuesPreview ?? [],
      });
      setActiveAlert(summaryPayload.activeAlert ?? null);
      setNotifications(
        notificationsRes.ok && notificationsPayload.notifications ? notificationsPayload.notifications : [],
      );
      setExcuses(excusesRes.ok && excusesPayload.excuses ? excusesPayload.excuses : []);
      setMembers(membersRes.ok && membersPayload.members ? membersPayload.members : []);
      setDues(duesRes.ok && duesPayload.months ? duesPayload.months : []);
      setDuesYear(duesPayload.year ?? new Date().getFullYear());
      setDuesAvailableYears(
        duesRes.ok && duesPayload.availableYears?.length ? duesPayload.availableYears : [duesPayload.year ?? new Date().getFullYear()],
      );
      setProfile(profileRes.ok && profilePayload.profile ? profilePayload.profile : null);

      const nonBlockingMessage =
        (!notificationsRes.ok && notificationsPayload.message) ||
        (!excusesRes.ok && excusesPayload.message) ||
        (!membersRes.ok && membersPayload.message) ||
        (!duesRes.ok && duesPayload.message) ||
        (!profileRes.ok && profilePayload.message) ||
        null;

      if (nonBlockingMessage) {
        setError(nonBlockingMessage);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedValue = window.localStorage.getItem(QUICK_ACCESS_STORAGE_KEY);
    if (!storedValue) return;

    try {
      const parsed = JSON.parse(storedValue) as QuickAccessKey[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuickAccess(parsed.slice(0, 6));
      }
    } catch {
      window.localStorage.removeItem(QUICK_ACCESS_STORAGE_KEY);
    }
  }, []);

  async function openNotifications() {
    setActiveSheet("notifications");
    if (summary.unreadNotificationCount > 0) {
      const markReadResponse = await fetch("/api/notifications", { method: "PATCH" });
      const markReadPayload = (await markReadResponse.json()) as { unreadCount?: number };

      if (markReadResponse.ok) {
        setSummary((prev) => ({
          ...prev,
          unreadNotificationCount: Number(markReadPayload.unreadCount ?? prev.unreadNotificationCount),
        }));
      }

      const response = await fetch("/api/notifications");
      const payload = (await response.json()) as { notifications?: NotificationItem[]; unreadCount?: number };
      if (response.ok && payload.notifications) {
        setNotifications(payload.notifications);
        setSummary((prev) => ({
          ...prev,
          unreadNotificationCount: Number(payload.unreadCount ?? prev.unreadNotificationCount),
        }));
      }
    }
  }

  async function reloadExcuses() {
    const response = await fetch("/api/excuses");
    const payload = (await response.json()) as { excuses?: ExcuseItem[] };
    if (response.ok && payload.excuses) {
      setExcuses(payload.excuses);
    }
  }

  async function reloadMonthlyDues(nextYear = duesYear) {
    const response = await fetch(`/api/monthly-dues?year=${nextYear}`);
    const payload = (await response.json()) as {
      months?: MonthlyDueItem[];
      year?: number;
      availableYears?: number[];
      message?: string;
    };

    if (response.ok) {
      setDues(payload.months ?? []);
      setDuesYear(payload.year ?? nextYear);
      setDuesAvailableYears(payload.availableYears?.length ? payload.availableYears : [payload.year ?? nextYear]);
      return;
    }

    setError(payload.message ?? "Unable to load monthly dues.");
  }

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function runWithLoader(action: () => void | Promise<void>) {
    setIsActionLoading(true);
    try {
      await action();
    } finally {
      setTimeout(() => setIsActionLoading(false), 180);
    }
  }

  function openFeature(feature: DashboardFeatureKey) {
    if (feature === "choir-finance") {
      void runWithLoader(async () => {
        router.push("/dashboard/choir-finance");
      });
      return;
    }
    if (feature === "complaint") {
      void runWithLoader(async () => {
        router.push("/dashboard/complaint");
      });
      return;
    }
    if (feature === "pay") {
      void runWithLoader(async () => {
        router.push("/dashboard/pay");
      });
      return;
    }
    if (feature === "payment-history") {
      void runWithLoader(async () => {
        router.push("/dashboard/pay/history");
      });
      return;
    }
    if (feature === "song-selections") {
      void runWithLoader(async () => {
        router.push("/dashboard/song-selections");
      });
      return;
    }
    if (feature === "attendance-history") {
      void runWithLoader(async () => {
        router.push("/dashboard/attendance-history");
      });
      return;
    }
    void runWithLoader(async () => {
      setActiveSheet(feature as ActiveSheet);
    });
  }

  function openQuickAccess(feature: QuickAccessKey) {
    if (feature === "notifications") {
      void runWithLoader(async () => {
        await openNotifications();
      });
      return;
    }

    openFeature(feature);
  }

  function toggleQuickAccess(feature: QuickAccessKey) {
    setQuickAccess((current) => {
      const next = current.includes(feature)
        ? current.filter((item) => item !== feature)
        : current.length >= 6
          ? [...current.slice(1), feature]
          : [...current, feature];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(QUICK_ACCESS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  function requestLogoutConfirmation() {
    void runWithLoader(async () => {
      setIsLogoutConfirmOpen(true);
    });
  }

  async function confirmLogout() {
    setIsLogoutConfirmOpen(false);
    await runWithLoader(async () => {
      await logout();
    });
  }

  async function refreshDashboardFromPull() {
    if (isPullRefreshing || isLoading || activeSheet) {
      setPullDistance(0);
      return;
    }

    setIsPullRefreshing(true);
    try {
      await loadDashboard({ showLoading: false });
    } finally {
      setPullDistance(0);
      setIsPullRefreshing(false);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (activeSheet || isActionLoading || isPullRefreshing || window.scrollY > 0) {
      pullStartYRef.current = null;
      isPullTrackingRef.current = false;
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    isPullTrackingRef.current = true;
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (!isPullTrackingRef.current || pullStartYRef.current === null || activeSheet || window.scrollY > 0) {
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

    const dampedDistance = Math.min(PULL_REFRESH_MAX, delta * 0.45);
    setPullDistance(dampedDistance);
  }

  function handleTouchEnd() {
    pullStartYRef.current = null;
    isPullTrackingRef.current = false;

    if (pullDistance >= PULL_REFRESH_TRIGGER) {
      void refreshDashboardFromPull();
      return;
    }

    setPullDistance(0);
  }

  const homeHint = useMemo(() => "Tap any feature to open details.", []);
  const pullProgress = Math.min(1, pullDistance / PULL_REFRESH_TRIGGER);
  const showPullRefresh = pullDistance > 0 || isPullRefreshing;

  return (
    <main
      className="min-h-screen bg-[var(--color-bg)] px-3 py-4 pb-28 sm:px-5 md:pb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`pointer-events-none fixed left-1/2 top-4 z-20 transition-all duration-200 ${
          showPullRefresh ? "opacity-100" : "translate-y-[-16px] opacity-0"
        }`}
        style={{ transform: `translate(-50%, ${showPullRefresh ? Math.max(0, pullDistance - 18) : -16}px)` }}
      >
        <div className="flex items-center gap-2 rounded-full border border-[#9FD6D5]/80 bg-white/95 px-4 py-2 text-sm font-semibold text-[#1E8C8A] shadow-[0_14px_32px_rgba(31,41,55,0.14)] backdrop-blur">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#9FD6D5] bg-[#EAF9F8] ${
              isPullRefreshing ? "animate-spin" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              style={{ transform: isPullRefreshing ? undefined : `rotate(${pullProgress * 180}deg)` }}
            >
              <path d="M12 5v14" />
              <path d="m7 10 5-5 5 5" />
            </svg>
          </span>
          <span>{isPullRefreshing ? "Refreshing dashboard..." : pullDistance >= PULL_REFRESH_TRIGGER ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>

      <section className="mx-auto w-full max-w-md space-y-4 sm:max-w-4xl">
        <div className="sticky top-3 z-30">
          <DashboardHeader
            firstName={unresolvedFirstName}
            choirLevel={profile?.choirLevel}
            profilePicture={profile?.profilePicture}
            unreadCount={summary.unreadNotificationCount}
            onAvatarClick={() =>
              void runWithLoader(async () => {
                setActiveSheet("profile");
              })
            }
            onOpenNotifications={() =>
              void runWithLoader(async () => {
                await openNotifications();
              })
            }
            onOpenEditProfile={() =>
              void runWithLoader(async () => {
                setActiveSheet("edit-profile");
              })
            }
            onOpenTheme={() =>
              void runWithLoader(async () => {
                setActiveSheet("change-theme");
              })
            }
            onOpenChangePassword={() =>
              void runWithLoader(async () => {
                setActiveSheet("change-password");
              })
            }
            onLogout={requestLogoutConfirmation}
            isLoggingOut={isLoggingOut}
          />
        </div>

        <div
          className="space-y-4 transition-transform duration-200 ease-out"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          <GreetingCard
            totalOwed={summary.debt.totalOwed}
            canAccessAdmin={role === "ADMIN" || role === "SUPER_ADMIN"}
            onOpenOwed={() =>
              void runWithLoader(async () => {
                setActiveSheet("owed-details");
              })
            }
            onOpenPay={() =>
              void runWithLoader(async () => {
                router.push("/dashboard/pay");
              })
            }
          />

          <FeatureGrid onOpenFeature={openFeature} />
          <DashboardQuickAccess
            features={quickAccess}
            unreadCount={summary.unreadNotificationCount}
            onOpenFeature={openQuickAccess}
            onCustomize={() =>
              void runWithLoader(async () => {
                setActiveSheet("quick-access");
              })
            }
          />
          <p className="hidden text-center text-xs text-slate-500 md:block">{homeHint}</p>

          {isLoading ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Loading dashboard...
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
        </div>
      </section>

      <DashboardSheet
        isOpen={activeSheet === "owed-details"}
        title="Total Owed Details"
        onClose={() => setActiveSheet(null)}
      >
        <TotalOwedCard debt={summary.debt} details={summary.debtDetails as DebtDetailBreakdown} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "notifications"}
        title="Notifications"
        onClose={() => setActiveSheet(null)}
      >
        <NotificationsPanel notifications={notifications} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "profile"}
        title="Profile"
        onClose={() => setActiveSheet(null)}
      >
        <ProfilePanel profile={profile} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "edit-profile"}
        title="Edit Profile"
        onClose={() => setActiveSheet(null)}
      >
        <EditProfileForm profile={profile} onSaved={(nextProfile) => setProfile(nextProfile)} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "change-theme"}
        title="Change Theme"
        onClose={() => setActiveSheet(null)}
      >
        <ChangeThemeForm />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "change-password"}
        title="Change Password"
        onClose={() => setActiveSheet(null)}
      >
        <ChangePasswordForm />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "excuses"}
        title="Excuses"
        onClose={() => setActiveSheet(null)}
      >
        <ExcusePanel items={excuses} onReload={reloadExcuses} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "monthly-dues"}
        title="Dues"
        onClose={() => setActiveSheet(null)}
      >
        <MonthlyDuesPanel
          debt={summary.debt}
          details={summary.debtDetails as DebtDetailBreakdown}
          months={dues}
          year={duesYear}
          availableYears={duesAvailableYears}
          onYearChange={reloadMonthlyDues}
        />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "members"}
        title="Members"
        onClose={() => setActiveSheet(null)}
      >
        <MembersPanel initialMembers={members} currentUserId={profile?.id} />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "excos"}
        title="Excos"
        onClose={() => setActiveSheet(null)}
      >
        <MembersPanel initialMembers={members} currentUserId={profile?.id} onlyWithPosts />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "more"}
        title="More"
        onClose={() => setActiveSheet(null)}
      >
        <DashboardMorePanel
          unreadCount={summary.unreadNotificationCount}
          onOpenPay={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/pay");
            });
          }}
          onOpenPaymentHistory={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/pay/history");
            });
          }}
          onOpenNotifications={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              await openNotifications();
            });
          }}
          onOpenComplaint={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/complaint");
            });
          }}
          onOpenSongSelections={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/song-selections");
            });
          }}
          onOpenAttendanceHistory={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/attendance-history");
            });
          }}
        />
      </DashboardSheet>

      <DashboardSheet
        isOpen={activeSheet === "quick-access"}
        title="Customize Quick Access"
        onClose={() => setActiveSheet(null)}
      >
        <QuickAccessCustomizer selectedFeatures={quickAccess} onToggleFeature={toggleQuickAccess} />
      </DashboardSheet>

      {isLogoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/45 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="font-display text-2xl text-[#1F2937]">Logout</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to logout?</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmLogout()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isActionLoading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1F2937]/25">
          <div className="rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#2CA6A4] border-t-transparent" />
              <p className="text-sm font-medium text-[#1F2937]">Loading...</p>
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(activeAlert)}
        title={activeAlert?.title ?? "Alert"}
        message={activeAlert?.message ?? ""}
        tone="danger"
        cancelLabel="Close"
        onClose={() => setActiveAlert(null)}
      />

      <DashboardBottomNav
        activeTab={
          activeSheet === "monthly-dues"
            ? "monthly-dues"
            : activeSheet === "members"
              ? "members"
              : activeSheet === "more"
                ? "more"
                : "home"
        }
        onSelect={(tab) => {
          if (tab === "home") {
            void runWithLoader(async () => {
              setActiveSheet(null);
            });
            return;
          }

          if (tab === "monthly-dues" || tab === "members" || tab === "more") {
            void runWithLoader(async () => {
              setActiveSheet(tab);
            });
            return;
          }

          if (tab === "choir-finance") {
            void runWithLoader(async () => {
              router.push("/dashboard/choir-finance");
            });
          }
        }}
      />
    </main>
  );
}
