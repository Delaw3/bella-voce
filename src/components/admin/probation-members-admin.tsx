"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { formatAppDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AttendanceItem = {
  id: string;
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
};

type ProbationMemberItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  voicePart: string;
  choirLevel: string;
  profilePicture?: string;
  attendance: AttendanceItem[];
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    excused: number;
  };
};

const statusClasses = {
  PRESENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  EXCUSED: "border-slate-200 bg-slate-100 text-slate-600",
} as const;

function getDisplayAttendanceStatus(status: AttendanceItem["status"]): "PRESENT" | "ABSENT" | "EXCUSED" {
  return status === "LATE" ? "PRESENT" : status;
}

function normalizeProbationMember(member: ProbationMemberItem): ProbationMemberItem {
  const attendance = member.attendance.map((item) => ({
    ...item,
    status: getDisplayAttendanceStatus(item.status),
  })) as Array<AttendanceItem & { status: "PRESENT" | "ABSENT" | "EXCUSED" }>;

  return {
    ...member,
    attendance,
    attendanceSummary: {
      total: attendance.length,
      present: attendance.filter((item) => item.status === "PRESENT").length,
      absent: attendance.filter((item) => item.status === "ABSENT").length,
      excused: attendance.filter((item) => item.status === "EXCUSED").length,
    },
  };
}

export function ProbationMembersAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<ProbationMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      const response = await fetch(`/api/admin/probation-members?ts=${Date.now()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: ProbationMemberItem[]; message?: string };

      if (cancelled) return;

      if (response.ok) {
        setItems((payload.items ?? []).map(normalizeProbationMember));
      } else {
        setMessage(payload.message ?? "Unable to load probation members.");
      }

      setIsLoading(false);
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Probation Members"
        description="Review members currently on probation and inspect their recent attendance record."
        badge="Probation Watch"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Recent attendance entries help you track consistency during probation.</p>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading probation members...</p> : null}
      {message ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
      {!isLoading && !message && items.length === 0 ? <EmptyState message="No probation members found." /> : null}

      <section className="grid gap-4">
        {items.map((member) => (
          <article
            key={member.id}
            className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {member.profilePicture ? (
                  <button
                    type="button"
                    onClick={() => setViewerImageUrl(member.profilePicture || "")}
                    className="rounded-full transition hover:opacity-90"
                    aria-label={`View ${member.firstName} ${member.lastName} profile picture`}
                  >
                    <img
                      src={member.profilePicture}
                      alt={`${member.firstName} ${member.lastName}`}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-[#9FD6D5]/70"
                    />
                  </button>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF9F8] text-base font-semibold text-[#1E8C8A]">
                    {member.firstName.charAt(0)}
                    {member.lastName.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-[#1F2937]">
                    {member.firstName} {member.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{member.voicePart || "No voice part set"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#F8FAFA] px-3 py-1 text-xs font-semibold text-slate-500">
                  {member.attendanceSummary.total} record{member.attendanceSummary.total === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A] uppercase">
                  {member.choirLevel}
                </span>
              </div>
            </div>

            <details className="group mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-[#F8FAFA] open:border-[#9FD6D5] open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Review Attendance</h3>
                  <p className="mt-1 text-xs text-slate-500">Open to inspect summary and recent attendance records.</p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-500 transition group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>

              <div className="border-t border-slate-100 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Present", value: member.attendanceSummary.present },
                    { label: "Absent", value: member.attendanceSummary.absent },
                    { label: "Excused", value: member.attendanceSummary.excused },
                  ].map((summary) => (
                    <div key={summary.label} className="rounded-2xl bg-[#F8FAFA] px-4 py-3">
                      <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">{summary.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#1F2937]">{summary.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  {member.attendance.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFA] px-4 py-4 text-sm text-slate-500">
                      No attendance record found yet.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {member.attendance.map((attendance) => {
                        const displayStatus = getDisplayAttendanceStatus(attendance.status);

                        return (
                          <div
                            key={attendance.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F8FAFA] px-4 py-3"
                          >
                            <p className="text-sm font-medium text-[#1F2937]">{formatAppDate(attendance.date)}</p>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[displayStatus]}`}>
                              {displayStatus}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </details>
          </article>
        ))}
      </section>

      {viewerImageUrl ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/55 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <button
              type="button"
              onClick={() => setViewerImageUrl("")}
              className="absolute right-4 top-4 rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-[#9FD6D5] hover:text-[#1E8C8A]"
              aria-label="Close image viewer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <img src={viewerImageUrl} alt="Profile preview" className="mt-8 w-full rounded-[24px] object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
