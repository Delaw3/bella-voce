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
import { RealtimeNotificationBridge } from "@/components/realtime-notification-bridge";
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
import { RealtimeNotificationPayload } from "@/types/realtime";
import { usePathname, useRouter } from "next/navigation";
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
const PUSH_PROMPT_DISMISSED_STORAGE_KEY = "bella-voce.push-prompt-dismissed";
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
  const pathname = usePathname();
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
  const [actionLoadingText, setActionLoadingText] = useState("Opening...");
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [liveNotification, setLiveNotification] = useState<RealtimeNotificationPayload | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });
  const [isPushSupported, setIsPushSupported] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  });
  const [isPushPromptDismissed, setIsPushPromptDismissed] = useState(false);
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
      setDuesAvailableYears(duesRes.ok && duesPayload.availableYears ? duesPayload.availableYears : []);
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
    if (!liveNotification) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setLiveNotification(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [liveNotification]);

  useEffect(() => {
    if (!pendingRoute || pathname !== pendingRoute) {
      return;
    }

    setPendingRoute(null);
    setIsActionLoading(false);
  }, [pathname, pendingRoute]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsPushPromptDismissed(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_STORAGE_KEY) === "1");

    const handlePushStatus = (event: Event) => {
      const detail = (event as CustomEvent<{
        permission: NotificationPermission | "unsupported";
        supported: boolean;
      }>).detail;

      if (!detail) {
        return;
      }

      setPushPermission(detail.permission);
      setIsPushSupported(detail.supported);

      if (detail.permission !== "default") {
        window.localStorage.removeItem(PUSH_PROMPT_DISMISSED_STORAGE_KEY);
        setIsPushPromptDismissed(false);
      }
    };

    window.addEventListener("bella-voce-push-status", handlePushStatus as EventListener);
    return () => {
      window.removeEventListener("bella-voce-push-status", handlePushStatus as EventListener);
    };
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
      setDuesAvailableYears(payload.availableYears ?? []);
      return;
    }

    setError(payload.message ?? "Unable to load monthly dues.");
  }

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setPendingRoute("/login");
    router.push("/login");
    router.refresh();
  }

  async function runWithLoader(
    action: () => void | Promise<void>,
    loadingText = "Opening...",
    options?: { routeTarget?: string },
  ) {
    setActionLoadingText(loadingText);
    setIsActionLoading(true);
    setPendingRoute(options?.routeTarget ?? null);
    try {
      await action();
    } finally {
      if (!options?.routeTarget) {
        setTimeout(() => setIsActionLoading(false), 180);
      }
    }
  }

  function openFeature(feature: DashboardFeatureKey) {
    if (feature === "choir-finance") {
      void runWithLoader(async () => {
        router.push("/dashboard/choir-finance");
      }, "Opening Choir Finance...", { routeTarget: "/dashboard/choir-finance" });
      return;
    }
    if (feature === "complaint") {
      void runWithLoader(async () => {
        router.push("/dashboard/complaint");
      }, "Opening Complaint...", { routeTarget: "/dashboard/complaint" });
      return;
    }
    if (feature === "pay") {
      void runWithLoader(async () => {
        router.push("/dashboard/pay");
      }, "Opening Payment...", { routeTarget: "/dashboard/pay" });
      return;
    }
    if (feature === "payment-history") {
      void runWithLoader(async () => {
        router.push("/dashboard/pay/history");
      }, "Opening Payment History...", { routeTarget: "/dashboard/pay/history" });
      return;
    }
    if (feature === "song-selections") {
      void runWithLoader(async () => {
        router.push("/dashboard/song-selections");
      }, "Opening Song Selections...", { routeTarget: "/dashboard/song-selections" });
      return;
    }
    if (feature === "psalmist") {
      void runWithLoader(async () => {
        router.push("/dashboard/psalmist");
      }, "Opening Psalmist...", { routeTarget: "/dashboard/psalmist" });
      return;
    }
    if (feature === "attendance-history") {
      void runWithLoader(async () => {
        router.push("/dashboard/attendance-history");
      }, "Opening Attendance History...", { routeTarget: "/dashboard/attendance-history" });
      return;
    }
    void runWithLoader(async () => {
      setActiveSheet(feature as ActiveSheet);
    }, "Opening...");
  }

  function openQuickAccess(feature: QuickAccessKey) {
    if (feature === "notifications") {
      void runWithLoader(async () => {
        await openNotifications();
      }, "Opening Notifications...");
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
    }, "Opening Logout...");
  }

  async function confirmLogout() {
    setIsLogoutConfirmOpen(false);
    await runWithLoader(async () => {
      await logout();
    }, "Logging out...");
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
  const showPullRefresh = pullDistance > 0 || isPullRefreshing;
  const showDashboardPushPrompt = isPushSupported && pushPermission === "default" && !isPushPromptDismissed;

  function mergeNotifications(current: NotificationItem[], incoming: RealtimeNotificationPayload) {
    const existingIndex = current.findIndex((item) => item.id === incoming.id);

    if (existingIndex >= 0) {
      const next = [...current];
      next[existingIndex] = incoming;
      return next.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    return [incoming, ...current].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  function applyRealtimeNotification(incoming: RealtimeNotificationPayload) {
    setNotifications((current) => mergeNotifications(current, incoming));
    setSummary((current) => {
      const alreadyExists = current.notifications.some((item) => item.id === incoming.id);
      const unreadIncrement = alreadyExists || incoming.isRead ? 0 : 1;

      return {
        ...current,
        notifications: mergeNotifications(current.notifications, incoming).slice(0, 5),
        unreadNotificationCount: current.unreadNotificationCount + unreadIncrement,
      };
    });

    if (incoming.type === "ALERT" && !activeAlert) {
      setActiveAlert(incoming);
    }

    setLiveNotification(incoming);
  }

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

      <section className="mx-auto w-full max-w-md space-y-4 sm:max-w-4xl">
        <RealtimeNotificationBridge enabled onNotification={applyRealtimeNotification} />

        <div className="sticky top-3 z-30">
          <DashboardHeader
            firstName={unresolvedFirstName}
            choirLevel={profile?.choirLevel}
            profilePicture={profile?.profilePicture}
            unreadCount={summary.unreadNotificationCount}
            onAvatarClick={() =>
              void runWithLoader(async () => {
                setActiveSheet("profile");
              }, "Opening Profile...")
            }
            onOpenNotifications={() =>
              void runWithLoader(async () => {
                await openNotifications();
              }, "Opening Notifications...")
            }
            onOpenEditProfile={() =>
              void runWithLoader(async () => {
                setActiveSheet("edit-profile");
              }, "Opening Edit Profile...")
            }
            onOpenTheme={() =>
              void runWithLoader(async () => {
                setActiveSheet("change-theme");
              }, "Opening Theme...")
            }
            onOpenChangePassword={() =>
              void runWithLoader(async () => {
                setActiveSheet("change-password");
              }, "Opening Change Password...")
            }
            onLogout={requestLogoutConfirmation}
            isLoggingOut={isLoggingOut}
          />
        </div>

        <div
          className="space-y-4 transition-transform duration-200 ease-out"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          {showDashboardPushPrompt ? (
            <div className="rounded-2xl border border-[#9FD6D5]/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef8f7_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(31,41,55,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1F2937]">Turn on app notifications</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Get instant alerts for complaint replies, excuse decisions, payments, dues updates, and song posts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPushPromptDismissed(true);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(PUSH_PROMPT_DISMISSED_STORAGE_KEY, "1");
                    }
                  }}
                  className="rounded-xl border border-[#9FD6D5] p-2 text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
                  aria-label="Dismiss notification permission prompt"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("bella-voce-enable-push"))}
                  className="rounded-2xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A]"
                >
                  Enable Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheet("notifications");
                  }}
                  className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
                >
                  View Notifications
                </button>
              </div>
            </div>
          ) : null}

          {liveNotification ? (
            <button
              type="button"
              onClick={() => {
                if (liveNotification.route) {
                  router.push(liveNotification.route);
                } else {
                  void openNotifications();
                }
                setLiveNotification(null);
              }}
              className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(31,41,55,0.08)] transition hover:bg-[#F8FAFA]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1F2937]">{liveNotification.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{liveNotification.message}</p>
                </div>
                <span className="rounded-full bg-[#EAF9F8] px-2 py-1 text-[11px] font-semibold text-[#1E8C8A]">
                  New
                </span>
              </div>
            </button>
          ) : null}

          <GreetingCard
            totalOwed={summary.debt.totalOwed}
            canAccessAdmin={role === "ADMIN" || role === "SUPER_ADMIN"}
            onOpenOwed={() =>
              void runWithLoader(async () => {
                setActiveSheet("owed-details");
              }, "Opening Total Owed...")
            }
            onOpenPay={() =>
              void runWithLoader(async () => {
                router.push("/dashboard/pay");
              }, "Opening Payment...", { routeTarget: "/dashboard/pay" })
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
              }, "Opening Quick Access...")
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
          onOpenExcuses={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              setActiveSheet("excuses");
            }, "Opening Excuses...");
          }}
          onOpenPay={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/pay");
            }, "Opening Payment...", { routeTarget: "/dashboard/pay" });
          }}
          onOpenPaymentHistory={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/pay/history");
            }, "Opening Payment History...", { routeTarget: "/dashboard/pay/history" });
          }}
          onOpenExcos={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              setActiveSheet("excos");
            }, "Opening Excos...");
          }}
          onOpenNotifications={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              await openNotifications();
            }, "Opening Notifications...");
          }}
          onOpenComplaint={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/complaint");
            }, "Opening Complaint...", { routeTarget: "/dashboard/complaint" });
          }}
          onOpenSongSelections={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/song-selections");
            }, "Opening Song Selections...", { routeTarget: "/dashboard/song-selections" });
          }}
          onOpenPsalmist={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/psalmist");
            }, "Opening Psalmist...", { routeTarget: "/dashboard/psalmist" });
          }}
          onOpenAttendanceHistory={() => {
            setActiveSheet(null);
            void runWithLoader(async () => {
              router.push("/dashboard/attendance-history");
            }, "Opening Attendance History...", { routeTarget: "/dashboard/attendance-history" });
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--color-bg)]/92 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 text-[#1E8C8A]">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#9FD6D5] border-t-[#1E8C8A]" />
            <p className="text-sm font-semibold">{actionLoadingText}</p>
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
            }, "Opening Home...");
            return;
          }

          if (tab === "monthly-dues" || tab === "members" || tab === "more") {
            void runWithLoader(async () => {
              setActiveSheet(tab);
            }, `Opening ${tab === "monthly-dues" ? "Dues" : tab === "members" ? "Members" : "More"}...`);
            return;
          }

          if (tab === "choir-finance") {
            void runWithLoader(async () => {
              router.push("/dashboard/choir-finance");
            }, "Opening Choir Finance...", { routeTarget: "/dashboard/choir-finance" });
          }
        }}
      />
    </main>
  );
}
