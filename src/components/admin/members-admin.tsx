"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { useCan } from "@/components/admin/admin-session-provider";
import { ActionModal } from "@/components/ui/action-modal";
import { USER_STATUSES } from "@/lib/user-config";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import { formatAppDateTime, formatDisplayName, formatInitials } from "@/lib/utils";
import { AdminMemberItem } from "@/types/admin";
import Image from "next/image";
import { useEffect, useState } from "react";

type MembersAdminProps = {
  currentRole: string;
};

type MembersResponse = {
  members?: AdminMemberItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  message?: string;
};

const initialPagination = { page: 1, limit: 10, total: 0, totalPages: 1 };

export function MembersAdmin({ currentRole }: MembersAdminProps) {
  const canEditMembers = useCan("members.edit");
  const canManageMemberAccess = useCan("members.delete");
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState(initialPagination);
  const [selectedMember, setSelectedMember] = useState<AdminMemberItem | null>(null);
  const [draft, setDraft] = useState<AdminMemberItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [activationTarget, setActivationTarget] = useState<AdminMemberItem | null>(null);
  const [isTogglingActivation, setIsTogglingActivation] = useState(false);

  async function loadMembers(nextPage = pagination.page, search = query) {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(pagination.limit),
    });
    if (search.trim()) params.set("q", search.trim());

    const response = await fetch(`/api/admin/members?${params.toString()}`);
    const payload = (await response.json()) as MembersResponse;

    if (response.ok) {
      setMembers(payload.members ?? []);
      setPagination(payload.pagination ?? initialPagination);
    } else {
      setFeedback(payload.message ?? "Unable to load members.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/members?page=1&limit=10");
      const payload = (await response.json()) as MembersResponse;

      if (cancelled) return;

      if (response.ok) {
        setMembers(payload.members ?? []);
        setPagination(payload.pagination ?? initialPagination);
      } else {
        setFeedback(payload.message ?? "Unable to load members.");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openMember(memberId: string) {
    setOpeningId(memberId);
    const response = await fetch(`/api/admin/members/${memberId}`);
    const payload = (await response.json()) as { member?: AdminMemberItem; message?: string };

    if (!response.ok || !payload.member) {
      setFeedback(payload.message ?? "Unable to load member details.");
      setOpeningId(null);
      return;
    }

    setSelectedMember(payload.member);
    setDraft(payload.member);
    setIsEditing(false);
    setOpeningId(null);
  }

  async function saveMember() {
    if (!draft) return;
    setIsSavingMember(true);

    const response = await fetch(`/api/admin/members/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        username: draft.username,
        phoneNumber: draft.phoneNumber,
        stateOfOrigin: draft.stateOfOrigin,
        educationLevel: draft.educationLevel,
        voicePart: draft.voicePart,
        status: draft.status,
      }),
    });

    const payload = (await response.json()) as { member?: AdminMemberItem; message?: string };
    setFeedback(payload.message ?? null);

    if (response.ok && payload.member) {
      setSelectedMember(payload.member);
      setDraft(payload.member);
      setIsEditing(false);
      void loadMembers(pagination.page);
    }
    setIsSavingMember(false);
  }

  async function toggleMemberActivation(member: AdminMemberItem) {
    const isInactive = member.status === "INACTIVE";
    setIsTogglingActivation(true);

    const response = await fetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isInactive ? "ACTIVE" : "INACTIVE" }),
    });
    const payload = (await response.json()) as { message?: string; member?: AdminMemberItem };
    setFeedback(payload.message ?? null);

    if (response.ok) {
      if (payload.member) {
        setMembers((current) => current.map((item) => (item.id === payload.member?.id ? payload.member : item)));
      } else {
        void loadMembers(pagination.page);
      }
      if (selectedMember?.id === member.id && payload.member) {
        setSelectedMember(payload.member);
        setDraft(payload.member);
      }
    }
    setIsTogglingActivation(false);
    setActivationTarget(null);
  }

  function updateDraft<K extends keyof AdminMemberItem>(field: K, value: AdminMemberItem[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Members"
        description="Manage member accounts from a cleaner table view, inspect full profiles in a slide-up sheet, and update core member details or account status when allowed."
        badge="Members Control"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_16px_34px_rgba(31,41,55,0.07)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members by name, email, username, or voice part"
            className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none focus:border-[#2CA6A4]"
          />
          <button
            type="button"
            onClick={() => void loadMembers(1, query)}
            disabled={isLoading}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Search"}
          </button>
        </div>
        {feedback ? (
          <p className="mt-3 rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm text-[#1E8C8A]">
            {feedback}
          </p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-3 shadow-[0_16px_34px_rgba(31,41,55,0.07)] sm:p-4">
        {isLoading ? <p className="px-3 py-4 text-sm text-slate-600">Loading members...</p> : null}
        {!isLoading && members.length === 0 ? <EmptyState message="No members found." /> : null}

        {!isLoading && members.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    <th className="px-3 py-2 pr-6">Member</th>
                    <th className="px-5 py-2">Voice</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="rounded-2xl bg-[#F8FAFA] text-sm text-[#1F2937]">
                      <td className="rounded-l-2xl px-3 py-3 pr-6">
                        <div className="flex items-center gap-3">
                          {member.profilePicture ? (
                            <Image
                              src={getOptimizedSupabaseImageUrl(member.profilePicture, { width: 80, height: 80, quality: 70, resize: "cover" })}
                              alt={`${member.firstName} ${member.lastName}`}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF9F8] text-xs font-semibold text-[#1E8C8A]">
                              {formatInitials(member.firstName, member.lastName)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{formatDisplayName(member.firstName, member.lastName)}</p>
                            <p className="text-xs text-slate-500">{member.username || "No username set"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{member.voicePart || "Not set"}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
                          {member.status}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <button
                          type="button"
                          onClick={() => void openMember(member.id)}
                          disabled={openingId === member.id}
                          className="rounded-xl border border-[#9FD6D5] px-3 py-2 text-xs font-semibold text-[#1E8C8A] disabled:opacity-50"
                        >
                          {openingId === member.id ? "Opening..." : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between px-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => void loadMembers(Math.max(1, pagination.page - 1), query)}
                className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => void loadMembers(Math.min(pagination.totalPages, pagination.page + 1), query)}
                className="rounded-xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>

      {selectedMember && draft ? (
        <div className="fixed inset-0 z-[70] bg-[#1F2937]/45">
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-2xl sm:rounded-l-[32px] sm:rounded-tr-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedMember.profilePicture ? (
                  <Image
                    src={getOptimizedSupabaseImageUrl(selectedMember.profilePicture, {
                      width: 160,
                      height: 160,
                      quality: 72,
                      resize: "cover",
                    })}
                    alt={`${selectedMember.firstName} ${selectedMember.lastName}`}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF9F8] text-lg font-semibold text-[#1E8C8A]">
                    {formatInitials(selectedMember.firstName, selectedMember.lastName)}
                  </div>
                )}
                <div>
                  <h2 className="font-display text-3xl text-[#1F2937]">
                    {formatDisplayName(selectedMember.firstName, selectedMember.lastName)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedMember.posts?.length ? selectedMember.posts.join(" | ") : "Member"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setDraft(null);
                  setIsEditing(false);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Member Details</h3>
                  {canEditMembers ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing((current) => !current)}
                      className="rounded-xl border border-[#9FD6D5] px-3 py-2 text-xs font-semibold text-[#1E8C8A]"
                    >
                      {isEditing ? "Cancel Edit" : "Edit"}
                    </button>
                  ) : null}
                </div>

        <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["First Name", "firstName"],
                    ["Last Name", "lastName"],
                    ["Email", "email"],
                    ["Username", "username"],
                    ["Phone Number", "phoneNumber"],
                    ["Phone Number 2", "phoneNumber2"],
                    ["Address", "address"],
                    ["State", "stateOfOrigin"],
                    ["LGA", "lga"],
                    ["Education Level", "educationLevel"],
                    ["Voice Part", "voicePart"],
                  ].map(([label, key]) => (
                    <label key={key} className="space-y-1.5">
                      <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</span>
                      <input
                        value={(draft[key as keyof AdminMemberItem] as string) ?? ""}
                        readOnly={!isEditing}
                        onChange={(event) => updateDraft(key as keyof AdminMemberItem, event.target.value as never)}
                        className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none read-only:bg-[#F8FAFA]"
                      />
                    </label>
                  ))}

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Status</span>
                    <select
                      value={draft.status ?? "ACTIVE"}
                      disabled={!isEditing}
                      onChange={(event) => updateDraft("status", event.target.value as never)}
                      className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none disabled:bg-[#F8FAFA]"
                    >
                      {USER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                </div>
              </section>

              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Accountability</h3>
                <div className="mt-3 rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Total Owed</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1F2937]">
                    ₦ {(selectedMember.totalOwed ?? 0).toLocaleString()}
                  </p>
                </div>
              </section>

              <section className="rounded-[24px] bg-[#F8FAFA] p-4">
                <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Account Meta</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Created</p>
                    <p className="mt-2 text-[#1F2937]">
                      {selectedMember.createdAt ? formatAppDateTime(selectedMember.createdAt) : "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Onboarding</p>
                    <p className="mt-2 text-[#1F2937]">
                      {selectedMember.onboardingCompleted ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="flex flex-wrap gap-3">
                {isEditing && canEditMembers ? (
                  <button
                    type="button"
                    onClick={() => void saveMember()}
                    disabled={isSavingMember}
                    className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
                  >
                    {isSavingMember ? "Saving..." : "Save Changes"}
                  </button>
                ) : null}
                {canManageMemberAccess && currentRole === "SUPER_ADMIN" ? (
                  <button
                    type="button"
                    onClick={() => setActivationTarget(selectedMember)}
                    disabled={isTogglingActivation}
                    className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
                      selectedMember.status === "INACTIVE"
                        ? "border border-emerald-200 text-emerald-700"
                        : "border border-red-200 text-red-600"
                    } disabled:opacity-50`}
                  >
                    {isTogglingActivation
                      ? selectedMember.status === "INACTIVE"
                        ? "Activating..."
                        : "Deactivating..."
                      : selectedMember.status === "INACTIVE"
                        ? "Activate User"
                        : "Deactivate User"}
                  </button>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(activationTarget)}
        title={activationTarget?.status === "INACTIVE" ? "Activate User?" : "Deactivate User?"}
        message={
          activationTarget?.status === "INACTIVE"
            ? "This user will be able to log in again."
            : "This user will lose access until an admin activates the account again."
        }
        tone={activationTarget?.status === "INACTIVE" ? "success" : "danger"}
        confirmLabel={activationTarget?.status === "INACTIVE" ? "Activate User" : "Deactivate User"}
        isProcessing={isTogglingActivation}
        onClose={() => setActivationTarget(null)}
        onConfirm={activationTarget ? () => void toggleMemberActivation(activationTarget) : undefined}
      />
    </div>
  );
}
