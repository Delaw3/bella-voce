"use client";

import { MemberItem } from "@/types/dashboard";
import { formatChoirPost } from "@/lib/utils";
import { FormEvent, useEffect, useState } from "react";

type MembersSectionProps = {
  initialMembers: MemberItem[];
};

export function MembersSection({ initialMembers }: MembersSectionProps) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  async function searchMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/members?q=${encodeURIComponent(query.trim())}`);
      const payload = (await response.json()) as { members?: MemberItem[] };
      if (response.ok && payload.members) {
        setMembers(payload.members);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)] sm:p-5">
      <h3 className="font-display text-2xl text-[#1F2937]">Members</h3>
      <p className="mt-1 text-sm text-slate-600">Read-only directory of choir members.</p>

      <form onSubmit={searchMembers} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members..."
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
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          No members found.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li key={member.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-sm font-semibold text-[#1F2937]">
                {member.firstName} {member.lastName}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {member.voicePart || "Voice part not set"} • {member.stateOfOrigin || "State of origin not set"}
              </p>
              <p className="mt-1 text-xs text-[#1E8C8A]">
                {member.posts?.length ? member.posts.map((post) => formatChoirPost(post)).join(", ") : "Member"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
