"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { excuseStatusClasses } from "@/lib/status-styles";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import { formatAppDate, formatAppTime, formatChoirPost, formatDisplayName, formatInitials } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

type AttendanceState = {
  present: boolean;
  late: boolean;
  absent: boolean;
  excused: boolean;
};

type AttendanceExcuseItem = {
  id: string;
  subject: string;
  reason: string;
  excuseDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
};

type AttendanceItem = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  voicePart?: string;
  profilePicture?: string;
  posts?: string[];
  state: AttendanceState;
  status: AttendanceStatus | null;
  excuse: AttendanceExcuseItem | null;
};

const attendanceActions: Array<{
  status: AttendanceStatus;
  label: string;
  activeClasses: string;
  idleClasses: string;
}> = [
  {
    status: "PRESENT",
    label: "Present",
    activeClasses: "border-emerald-200 bg-emerald-100 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]",
    idleClasses: "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50",
  },
  {
    status: "LATE",
    label: "Late",
    activeClasses: "border-amber-200 bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]",
    idleClasses: "border-amber-100 bg-white text-amber-700 hover:bg-amber-50",
  },
  {
    status: "ABSENT",
    label: "Absent",
    activeClasses: "border-red-200 bg-red-100 text-red-700 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.14)]",
    idleClasses: "border-red-100 bg-white text-red-700 hover:bg-red-50",
  },
  {
    status: "EXCUSED",
    label: "Excused",
    activeClasses: "border-blue-200 bg-blue-100 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.14)]",
    idleClasses: "border-blue-100 bg-white text-blue-700 hover:bg-blue-50",
  },
];

function stateToStatus(state: AttendanceState): AttendanceStatus | null {
  if (state.excused) return "EXCUSED";
  if (state.absent) return "ABSENT";
  if (state.late) return "LATE";
  if (state.present) return "PRESENT";
  return null;
}

function isActionActive(state: AttendanceState, status: AttendanceStatus) {
  if (status === "PRESENT") return state.present;
  if (status === "LATE") return state.late;
  if (status === "ABSENT") return state.absent;
  return state.excused;
}

function getDisplayStatus(state: AttendanceState): string | null {
  if (state.excused) return "EXCUSED";
  if (state.absent) return "ABSENT";
  if (state.present && state.late) return "PRESENT + LATE";
  if (state.late) return "LATE";
  if (state.present) return "PRESENT";
  return null;
}

function getNextState(currentState: AttendanceState, status: AttendanceStatus): AttendanceState {
  if (status === "PRESENT") {
    if (currentState.excused || currentState.absent) {
      return { present: true, late: false, absent: false, excused: false };
    }

    if (currentState.present && currentState.late) {
      return { present: true, late: false, absent: false, excused: false };
    }

    if (currentState.present) {
      return { present: false, late: false, absent: false, excused: false };
    }

    return { present: true, late: false, absent: false, excused: false };
  }

  if (status === "LATE") {
    if (currentState.excused || currentState.absent) {
      return { present: true, late: true, absent: false, excused: false };
    }

    if (currentState.late) {
      return { present: true, late: false, absent: false, excused: false };
    }

    return { present: true, late: true, absent: false, excused: false };
  }

  if (status === "ABSENT") {
    return currentState.absent
      ? { present: false, late: false, absent: false, excused: false }
      : { present: false, late: false, absent: true, excused: false };
  }

  return currentState.excused
    ? { present: false, late: false, absent: false, excused: false }
    : { present: false, late: false, absent: false, excused: true };
}

export function AttendanceAdmin() {
  const canMark = useCan("attendance.mark");
  const canDelete = useCan("attendance.delete");
  const canViewExcuses = useCan("excuses.view");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeExcuse, setActiveExcuse] = useState<{ memberName: string; item: AttendanceExcuseItem } | null>(null);

  async function loadItems(search = query, date = selectedDate) {
    setIsLoading(true);
    setMessage(null);
    const params = new URLSearchParams({ date });
    if (search.trim()) params.set("q", search.trim());

    const response = await fetch(`/api/admin/attendance?${params.toString()}`);
    const payload = (await response.json()) as { items?: AttendanceItem[]; message?: string };

    if (response.ok) {
      setItems(payload.items ?? []);
    } else {
      setMessage(payload.message ?? "Unable to load attendance.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      setMessage(null);

      const params = new URLSearchParams({ date: selectedDate });
      const response = await fetch(`/api/admin/attendance?${params.toString()}`);
      const payload = (await response.json()) as { items?: AttendanceItem[]; message?: string };

      if (cancelled) return;

      if (response.ok) {
        setItems(payload.items ?? []);
      } else {
        setMessage(payload.message ?? "Unable to load attendance.");
      }
      setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  async function markAttendance(userId: string, nextState: AttendanceState) {
    const nextStatus = stateToStatus(nextState);

    setSavingUserId(userId);
    const response = await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, state: nextState, date: selectedDate }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);

    if (response.ok) {
      setItems((current) =>
        current.map((item) =>
          item.userId === userId
            ? {
                ...item,
                state: nextState,
                status: nextStatus,
                excuse:
                  nextState.excused && item.excuse
                    ? {
                        ...item.excuse,
                        status: "APPROVED",
                      }
                    : item.excuse,
              }
            : item,
        ),
      );
    }
    setSavingUserId(null);
  }

  async function clearAttendance(userId: string) {
    setSavingUserId(userId);
    const response = await fetch("/api/admin/attendance", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date: selectedDate }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);

    if (response.ok) {
      setItems((current) =>
        current.map((item) =>
          item.userId === userId
            ? { ...item, state: { present: false, late: false, absent: false, excused: false }, status: null }
            : item,
        ),
      );
    }
    setSavingUserId(null);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Attendance"
        description="Mark attendance for the selected day, including excused members. Excused records do not trigger lateness or absence fees."
        badge="Daily Records"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member by name or email"
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void loadItems(query, selectedDate)}
            disabled={isLoading}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load"}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">Attendance for {formatAppDate(selectedDate)}</p>
        {message ? (
          <p className="mt-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1E8C8A]">{message}</p>
        ) : null}
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading attendance...</p> : null}
      {!isLoading && items.length === 0 ? <EmptyState message="No members found for attendance." /> : null}

      <div className="grid gap-3">
        {items.map((item) => {
          const displayName = formatDisplayName(item.firstName, item.lastName);

          return (
            <article
              key={item.userId}
              className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_12px_28px_rgba(31,41,55,0.06)]"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    {item.profilePicture ? (
                      <Image
                        src={getOptimizedSupabaseImageUrl(item.profilePicture, { width: 96, height: 96, quality: 70, resize: "cover" })}
                        alt={displayName}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9F8] text-sm font-semibold text-[#1E8C8A]">
                        {formatInitials(item.firstName, item.lastName)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#1F2937]">{displayName}</h2>
                      <p className="text-xs text-slate-500">
                        {[item.voicePart, item.posts?.length ? item.posts.map((post) => formatChoirPost(post)).join(" | ") : ""]
                          .filter(Boolean)
                          .join(" • ") || item.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.excuse ? (
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${excuseStatusClasses[item.excuse.status]}`}
                      >
                        Excuse: {item.excuse.status}
                      </span>
                    ) : null}
                    {getDisplayStatus(item.state) ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                        {getDisplayStatus(item.state)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {attendanceActions.map((action) => {
                    const active = isActionActive(item.state, action.status);
                    const disabled = !canMark || savingUserId === item.userId;
                    const nextState = getNextState(item.state, action.status);

                    return (
                      <button
                        key={action.status}
                        type="button"
                        disabled={disabled}
                        onClick={() => void markAttendance(item.userId, nextState)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                          active ? action.activeClasses : action.idleClasses
                        }`}
                      >
                        {savingUserId === item.userId ? "Saving..." : action.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.excuse && canViewExcuses ? (
                    <button
                      type="button"
                      onClick={() => setActiveExcuse({ memberName: displayName, item: item.excuse as AttendanceExcuseItem })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Excuse
                    </button>
                  ) : null}

                  {(item.state.present || item.state.late || item.state.absent || item.state.excused) && canDelete ? (
                    <button
                      type="button"
                      disabled={savingUserId === item.userId}
                      onClick={() => void clearAttendance(item.userId)}
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {savingUserId === item.userId ? "Clearing..." : "Clear"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {activeExcuse ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1F2937]/50 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Excuse Details</p>
                <h3 className="mt-1 text-xl font-semibold text-[#1F2937]">{activeExcuse.memberName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveExcuse(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-[#9FD6D5] hover:text-[#1E8C8A]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-[#9FD6D5]/60 bg-[#F8FAFA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{activeExcuse.item.subject}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${excuseStatusClasses[activeExcuse.item.status]}`}
                  >
                    {activeExcuse.item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{activeExcuse.item.reason}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Excuse Date</p>
                  <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatAppDate(activeExcuse.item.excuseDate)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Submitted</p>
                  <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatAppDate(activeExcuse.item.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatAppTime(activeExcuse.item.createdAt)}</p>
                </div>
              </div>

              {activeExcuse.item.adminComment ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Admin Comment</p>
                  <p className="mt-1 text-sm text-slate-700">{activeExcuse.item.adminComment}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
