"use client";

import { ProfileInfo } from "@/types/dashboard";
import { ProfileImageViewer } from "@/components/dashboard/profile-image-viewer";
import { capitalizeWords } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type ProfilePanelProps = {
  profile: ProfileInfo | null;
};

type RowProps = { label: string; value?: string };

function Row({ label, value }: RowProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-sm text-[#1F2937]">{value || "Not provided"}</p>
    </div>
  );
}

export function ProfilePanel({ profile }: ProfilePanelProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  if (!profile) {
    return <p className="text-sm text-slate-500">Loading profile...</p>;
  }

  const normalizedFirstName = capitalizeWords(profile.firstName);
  const normalizedLastName = capitalizeWords(profile.lastName);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
        {profile.profilePicture ? (
          <button
            type="button"
            onClick={() => setIsImageViewerOpen(true)}
            aria-label="View profile picture"
            className="rounded-full transition hover:opacity-90"
          >
            <Image
              src={profile.profilePicture}
              alt={`${normalizedFirstName} profile`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          </button>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9F8] text-lg font-semibold text-[#1E8C8A]">
            {normalizedFirstName?.slice(0, 1).toUpperCase() || "B"}
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-[#1F2937]">
            {normalizedFirstName} {normalizedLastName}
          </p>
          <p className="text-sm text-slate-600">@{profile.username}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Row label="Email" value={profile.email} />
        <Row label="Phone Number" value={profile.phoneNumber} />
        <Row label="State of Origin" value={profile.stateOfOrigin ? capitalizeWords(profile.stateOfOrigin) : ""} />
        <Row label="LGA" value={profile.lga ? capitalizeWords(profile.lga) : ""} />
        <Row
          label="Education Level"
          value={profile.educationLevel ? capitalizeWords(profile.educationLevel) : ""}
        />
        <Row label="Voice Part" value={profile.voicePart ? capitalizeWords(profile.voicePart) : ""} />
        <Row label="Choir Level" value={profile.choirLevel ? capitalizeWords(profile.choirLevel) : "Member"} />
        <Row
          label="Posts"
          value={profile.posts?.length ? profile.posts.map((post) => capitalizeWords(post)).join(", ") : ""}
        />
      </div>

      <ProfileImageViewer
        isOpen={isImageViewerOpen}
        imageUrl={profile.profilePicture}
        alt={`${normalizedFirstName} ${normalizedLastName} profile picture`}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </div>
  );
}
