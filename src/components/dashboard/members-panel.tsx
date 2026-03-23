"use client";

import { MemberItem } from "@/types/dashboard";
import { ProfileImageViewer } from "@/components/dashboard/profile-image-viewer";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { capitalizeWords, formatChoirPost, isGoldChoirPost } from "@/lib/utils";
import { FormEvent, useEffect, useState } from "react";

type MembersPanelProps = {
  initialMembers: MemberItem[];
  currentUserId?: string;
  onlyWithPosts?: boolean;
};

function DetailRow({
  label,
  value,
  className = "border-slate-100 bg-slate-50",
  valueClassName = "text-[#1F2937]",
}: {
  label: string;
  value?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${className}`}>
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-sm ${valueClassName}`}>{value || "Not provided"}</p>
    </div>
  );
}

export function MembersPanel({ initialMembers, currentUserId, onlyWithPosts = false }: MembersPanelProps) {
  const [members, setMembers] = useState<MemberItem[]>(
    onlyWithPosts ? initialMembers.filter((member) => member.posts?.length) : initialMembers,
  );
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState("");
  const [viewerImageAlt, setViewerImageAlt] = useState("Profile picture");

  useEffect(() => {
    setMembers(onlyWithPosts ? initialMembers.filter((member) => member.posts?.length) : initialMembers);
  }, [initialMembers, onlyWithPosts]);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (onlyWithPosts) params.set("hasPosts", "true");

      const response = await fetch(`/api/members?${params.toString()}`);
      const payload = (await response.json()) as { members?: MemberItem[] };
      if (response.ok && payload.members) {
        setMembers(payload.members);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={onlyWithPosts ? "Search excos by name, voice part, post..." : "Search by name, voice part, post..."}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-70"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </form>

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {onlyWithPosts ? "No excos found." : "No members found."}
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => {
            const firstName = capitalizeWords(member.firstName);
            const lastName = capitalizeWords(member.lastName);
            const initials = `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
            const isCurrentUser = Boolean(currentUserId && member.id === currentUserId);

            return (
              <li key={member.id}>
                <div
                  className={`w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left ${
                    isCurrentUser ? "" : "transition hover:border-[#9FD6D5]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCurrentUser) setSelectedMember(member);
                    }}
                    disabled={isCurrentUser}
                    className="w-full text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      {member.profilePicture ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`View ${firstName} ${lastName} profile picture`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setViewerImageUrl(member.profilePicture || "");
                            setViewerImageAlt(`${firstName} ${lastName} profile picture`);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              setViewerImageUrl(member.profilePicture || "");
                              setViewerImageAlt(`${firstName} ${lastName} profile picture`);
                            }
                          }}
                          className="rounded-full transition hover:opacity-90"
                        >
                          <ProfileAvatar
                            src={member.profilePicture}
                            alt={`${firstName} ${lastName} profile`}
                            initials={initials || "BV"}
                            size={48}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        </span>
                      ) : (
                        <ProfileAvatar
                          alt={`${firstName} ${lastName} profile`}
                          initials={initials || "BV"}
                          size={48}
                          fallbackClassName="h-12 w-12"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">
                          {isCurrentUser ? "You" : `${firstName} ${lastName}`}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-600">
                            {member.voicePart ? capitalizeWords(member.voicePart) : "Voice part not set"}
                          </p>
                          {member.posts?.length
                            ? member.posts.map((post) => (
                                <span
                                  key={`${member.id}-${post}`}
                                  className={[
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    isGoldChoirPost(post)
                                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                                      : "border border-[#9FD6D5] bg-[#EAF9F8] text-[#1E8C8A]",
                                  ].join(" ")}
                                >
                                  {formatChoirPost(post)}
                                </span>
                              ))
                            : null}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedMember ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#1F2937]/45 p-3 sm:items-center sm:justify-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-display text-2xl text-[#1F2937]">Member Profile</h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                aria-label="Close"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#9FD6D5] hover:text-[#1E8C8A]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(92vh-4rem)] space-y-3 overflow-y-auto p-4">
              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
                {selectedMember.profilePicture ? (
                  <button
                    type="button"
                    aria-label="View selected member profile picture"
                    onClick={() => {
                      setViewerImageUrl(selectedMember.profilePicture || "");
                      setViewerImageAlt(
                        `${capitalizeWords(selectedMember.firstName)} ${capitalizeWords(selectedMember.lastName)} profile picture`,
                      );
                    }}
                    className="rounded-full transition hover:opacity-90"
                  >
                    <ProfileAvatar
                      src={selectedMember.profilePicture}
                      alt={`${selectedMember.firstName} ${selectedMember.lastName} profile`}
                      initials={`${selectedMember.firstName.slice(0, 1)}${selectedMember.lastName.slice(0, 1)}`.toUpperCase()}
                      size={72}
                      className="h-[72px] w-[72px] rounded-full object-cover"
                      imageOptions={{
                        width: 144,
                        height: 144,
                        quality: 72,
                        resize: "cover",
                      }}
                    />
                  </button>
                ) : (
                  <ProfileAvatar
                    alt={`${selectedMember.firstName} ${selectedMember.lastName} profile`}
                    initials={`${selectedMember.firstName.slice(0, 1)}${selectedMember.lastName.slice(0, 1)}`.toUpperCase()}
                    size={72}
                    fallbackClassName="h-[72px] w-[72px]"
                  />
                )}
                <p className="text-base font-semibold text-[#1F2937]">
                  {capitalizeWords(selectedMember.firstName)} {capitalizeWords(selectedMember.lastName)}
                </p>
                {selectedMember.posts?.length ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {selectedMember.posts.map((post) => (
                      <span
                        key={`selected-${selectedMember.id}-${post}`}
                        className={[
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                          isGoldChoirPost(post)
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-[#9FD6D5] bg-[#EAF9F8] text-[#1E8C8A]",
                        ].join(" ")}
                      >
                        {formatChoirPost(post)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <DetailRow
                  label="Voice Part"
                  value={selectedMember.voicePart ? capitalizeWords(selectedMember.voicePart) : ""}
                  className="border-[#9FD6D5] bg-[#EAF9F8]"
                  valueClassName="font-semibold text-[#1E8C8A]"
                />
                <DetailRow label="Email" value={selectedMember.email} />
                <DetailRow label="Phone Number" value={selectedMember.phoneNumber} />
                <DetailRow label="Phone Number 2" value={selectedMember.phoneNumber2} />
                <DetailRow label="Address" value={selectedMember.address} />
                <DetailRow
                  label="Education Level"
                  value={selectedMember.educationLevel ? capitalizeWords(selectedMember.educationLevel) : ""}
                />
                <DetailRow
                  label="State of Origin"
                  value={selectedMember.stateOfOrigin ? capitalizeWords(selectedMember.stateOfOrigin) : ""}
                />
                <DetailRow label="LGA" value={selectedMember.lga ? capitalizeWords(selectedMember.lga) : ""} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ProfileImageViewer
        isOpen={Boolean(viewerImageUrl)}
        imageUrl={viewerImageUrl}
        alt={viewerImageAlt}
        onClose={() => setViewerImageUrl("")}
      />
    </div>
  );
}
