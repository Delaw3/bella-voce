"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import {
  canRoleHoldPermissions,
  CHOIR_POSTS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type PermissionKey,
  resolvePermissions,
} from "@/lib/user-config";
import { formatDisplayName } from "@/lib/utils";
import { AdminMemberItem } from "@/types/admin";
import { useEffect, useState } from "react";

type MembersResponse = {
  members?: AdminMemberItem[];
  message?: string;
};

export function RolesAdmin() {
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<AdminMemberItem | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [mobileAccessOpen, setMobileAccessOpen] = useState(false);

  useEffect(() => {
    if (feedback?.tone !== "success") return;

    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const filteredMembers = members.filter((member) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;

    return [
      member.firstName,
      member.lastName,
      member.email,
      member.username,
      member.role,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  function showPermissionPopup() {
    setPermissionModalOpen(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/members?page=1&limit=100");
      const payload = (await response.json()) as MembersResponse;
      if (cancelled) return;
      if (response.ok) {
        setMembers(payload.members ?? []);
        if (payload.members?.[0]) {
          setSelectedId(payload.members[0].id);
          setDraft(payload.members[0]);
        }
      } else if (response.status === 403) {
        showPermissionPopup();
      } else {
        setFeedback({ tone: "error", text: payload.message ?? "Unable to load members." });
      }
      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectMember(memberId: string) {
    setSelectedId(memberId);
    setDraft(members.find((member) => member.id === memberId) ?? null);
    setMobileAccessOpen(true);
  }

  function togglePost(post: string) {
    setDraft((current) => {
      if (!current) return current;
      const posts = new Set(current.posts ?? []);
      if (posts.has(post)) posts.delete(post);
      else posts.add(post);
      return { ...current, posts: [...posts] };
    });
  }

  function togglePermission(permission: string) {
    setDraft((current) => {
      if (!current) return current;
      if (!canRoleHoldPermissions(current.role)) {
        return current;
      }
      const permissions = new Set(current.permissions ?? []);
      if (permissions.has(permission)) permissions.delete(permission);
      else permissions.add(permission);
      return { ...current, permissions: [...permissions] };
    });
  }

  async function saveDraft() {
    if (!draft) return;
    setIsSaving(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/members/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: draft.role,
        posts: draft.posts ?? [],
        permissions: draft.permissions ?? [],
        status: draft.status,
      }),
    });

    const payload = (await response.json()) as { member?: AdminMemberItem; message?: string };

    if (response.ok && payload.member) {
      const nextMember = payload.member;
      setMembers((current) => current.map((member) => (member.id === nextMember.id ? nextMember : member)));
      setSelectedId(nextMember.id);
      setDraft(nextMember);
      setFeedback({ tone: "success", text: payload.message ?? "Access saved successfully." });
    } else if (response.status === 403) {
      showPermissionPopup();
    } else {
      setFeedback({ tone: "error", text: payload.message ?? "Unable to save access settings." });
    }

    setIsSaving(false);
  }

  function renderAccessEditor(showCloseButton = false) {
    if (!draft) return null;
    const resolvedPermissions = resolvePermissions(draft.role, draft.permissions);

    return (
      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-[#1F2937]">
                {formatDisplayName(draft.firstName, draft.lastName)}
              </h2>
              <p className="text-sm text-slate-600">{draft.email}</p>
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={() => setMobileAccessOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 xl:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={isSaving}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving Access..." : "Save Access"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Role</span>
            <select
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => {
                  if (!current) return current;
                  const nextRole = event.target.value as AdminMemberItem["role"];
                  return {
                    ...current,
                    role: nextRole,
                    permissions: canRoleHoldPermissions(nextRole) ? current.permissions : [],
                  };
                })
              }
              className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Status</span>
            <select
              value={draft.status ?? "ACTIVE"}
              onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value } : current))}
              className="w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DELETED">DELETED</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-[24px] bg-[#F8FAFA] p-4">
          <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Posts</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CHOIR_POSTS.map((post) => (
              <label key={post} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <input type="checkbox" checked={draft.posts?.includes(post) ?? false} onChange={() => togglePost(post)} />
                <span>{post}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Permissions</h3>
            {draft.role === "SUPER_ADMIN" ? (
              <span className="text-xs text-[#1E8C8A]">SUPER_ADMIN has automatic access to every permission</span>
            ) : !canRoleHoldPermissions(draft.role) ? (
              <span className="text-xs text-slate-500">Set role to ADMIN or SUPER_ADMIN to grant access</span>
            ) : null}
          </div>
          {Object.entries(PERMISSION_GROUPS).map(([feature, actions]) => (
            <div key={feature} className="rounded-[24px] bg-[#F8FAFA] p-4">
              <p className="font-semibold text-[#1F2937]">{PERMISSION_LABELS[feature as keyof typeof PERMISSION_LABELS]}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((action) => {
                  const permission = `${feature}.${action}` as PermissionKey;
                  const active = resolvedPermissions.includes(permission);
                  return (
                    <label
                      key={permission}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                        active ? "border-[#2CA6A4] bg-[#EAF9F8] text-[#1E8C8A]" : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={!canRoleHoldPermissions(draft.role) || isSaving}
                        onChange={() => togglePermission(permission)}
                      />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Roles & Permissions"
        description="Assign role, multiple posts, and feature-level permissions from one organized control surface. SUPER_ADMIN remains the highest authority."
        badge="Access Control"
      />

      {feedback && feedback.tone === "error" ? (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {feedback.text}
        </p>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-600">Loading access settings...</p> : null}
      {!isLoading && members.length === 0 ? <EmptyState message="No users available for role management." /> : null}

      {!isLoading && members.length > 0 && draft ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
            <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Accounts</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search accounts"
              className="mt-4 w-full rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
            />
            <div className="mt-4 space-y-2">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectMember(member.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedId === member.id
                      ? "border-[#2CA6A4] bg-[#EAF9F8]"
                      : "border-slate-200 bg-[#F8FAFA] hover:border-[#9FD6D5]"
                  }`}
                >
                  <p className="font-semibold text-[#1F2937]">{formatDisplayName(member.firstName, member.lastName)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {member.role} | {member.permissions.length} permissions
                  </p>
                </button>
              ))}
            </div>
            {filteredMembers.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFA] px-4 py-5 text-sm text-slate-500">
                No accounts match your search.
              </p>
            ) : null}
          </section>

          <div className="hidden xl:block">{renderAccessEditor()}</div>
        </div>
      ) : null}

      {mobileAccessOpen && draft ? (
        <div className="fixed inset-0 z-[90] bg-[#1F2937]/45 xl:hidden">
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white p-4 shadow-2xl">
            {renderAccessEditor(true)}
          </div>
        </div>
      ) : null}

      <ActionModal
        open={permissionModalOpen}
        title="Permission Required"
        message="You don't have permission to perform this action."
        tone="danger"
        onClose={() => setPermissionModalOpen(false)}
      />

      <ActionModal
        open={feedback?.tone === "success"}
        title="Access Saved"
        message={feedback?.tone === "success" ? feedback.text : ""}
        tone="success"
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
