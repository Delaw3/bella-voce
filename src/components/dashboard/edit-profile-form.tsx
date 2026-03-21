"use client";

import { ProfileInfo } from "@/types/dashboard";
import { uploadProfilePicture } from "@/lib/upload-profile-picture";
import { capitalizeWords } from "@/lib/utils";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

const educationOptions = [
  "primary",
  "secondary",
  "year one",
  "year two",
  "year three",
  "year four",
  "year five",
  "year six",
  "finalist",
  "graduated",
  "not a student",
];

const voicePartOptions = ["soprano", "alto", "tenor", "bass"];
const choirLevelOptions = ["member", "probation"];
const MAX_PROFILE_PICTURE_SIZE_BYTES = 3 * 1024 * 1024;

type EditProfileFormProps = {
  profile: ProfileInfo | null;
  onSaved: (profile: ProfileInfo) => void;
};

export function EditProfileForm({ profile, onSaved }: EditProfileFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const [address, setAddress] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [voicePart, setVoicePart] = useState("");
  const [choirLevel, setChoirLevel] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [lgas, setLgas] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingLgas, setIsLoadingLgas] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const preferredLgaRef = useRef("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setPhoneNumber(profile.phoneNumber || "");
    setPhoneNumber2(profile.phoneNumber2 || "");
    setAddress(profile.address || "");
    setStateOfOrigin(profile.stateOfOrigin || "");
    setLga(profile.lga || "");
    preferredLgaRef.current = profile.lga || "";
    setEducationLevel(profile.educationLevel || "");
    setVoicePart(profile.voicePart || "");
    setChoirLevel(profile.choirLevel || "");
    setProfilePictureUrl(profile.profilePicture || "");
    setProfilePicturePreviewUrl(profile.profilePicture || "");
    setProfilePictureFile(null);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (profilePictureFile && profilePicturePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicturePreviewUrl);
      }
    };
  }, [profilePictureFile, profilePicturePreviewUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadStates() {
      try {
        setIsLoadingStates(true);
        const response = await fetch("/api/location/states");
        const payload = (await response.json()) as { states?: string[] };
        if (!response.ok || !payload.states) {
          throw new Error("Unable to load states");
        }
        if (!cancelled) {
          setStates(payload.states);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load states right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStates(false);
        }
      }
    }

    loadStates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLgas() {
      if (!stateOfOrigin) {
        setLgas([]);
        setLga("");
        return;
      }

      try {
        setIsLoadingLgas(true);
        const preferredLga = preferredLgaRef.current;
        const response = await fetch(`/api/location/lgas?state=${encodeURIComponent(stateOfOrigin)}`);
        const payload = (await response.json()) as { lgas?: string[] };
        if (!response.ok || !payload.lgas) {
          throw new Error("Unable to load LGAs");
        }

        if (!cancelled) {
          setLgas(payload.lgas);
          const stillExists = payload.lgas.some(
            (item) => item.toLowerCase() === preferredLga.trim().toLowerCase(),
          );
          if (!stillExists) {
            setLga("");
          } else if (preferredLga) {
            setLga(preferredLga);
          }
          preferredLgaRef.current = "";
        }
      } catch {
        if (!cancelled) {
          setLgas([]);
          setError("Unable to load LGAs for the selected state.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLgas(false);
        }
      }
    }

    loadLgas();
    return () => {
      cancelled = true;
    };
  }, [stateOfOrigin]);

  function onProfilePictureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setProfilePictureFile(null);
      setProfilePicturePreviewUrl(profilePictureUrl);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_SIZE_BYTES) {
      setError("Profile picture must be 3MB or less.");
      event.target.value = "";
      return;
    }

    setError(null);
    setProfilePictureFile(file);
    setProfilePicturePreviewUrl(URL.createObjectURL(file));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      let nextProfilePictureUrl = profilePictureUrl.trim();

      if (profilePictureFile) {
        if (!profile?.id) {
          setError("Unable to upload profile picture right now. Please refresh and try again.");
          return;
        }

        setIsUploadingPicture(true);
        try {
          const uploadedFile = await uploadProfilePicture(profilePictureFile, profile.id);
          nextProfilePictureUrl = uploadedFile.publicUrl;
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile picture.");
          return;
        } finally {
          setIsUploadingPicture(false);
        }
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          phoneNumber2,
          address,
          stateOfOrigin,
          lga,
          educationLevel,
          voicePart,
          choirLevel,
          profilePictureUrl: nextProfilePictureUrl,
        }),
      });

      const payload = (await response.json()) as { message?: string; profile?: ProfileInfo };
      if (!response.ok || !payload.profile) {
        setError(payload.message ?? "Unable to update profile.");
        return;
      }

      onSaved(payload.profile);
      setProfilePictureUrl(payload.profile.profilePicture || "");
      setProfilePicturePreviewUrl(payload.profile.profilePicture || "");
      setProfilePictureFile(null);
      setSuccess(payload.message ?? "Profile updated successfully.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-3xl border border-[#9FD6D5]/50 bg-[#F8FAFA] px-5 py-6 text-center shadow-[0_16px_40px_rgba(44,166,164,0.08)]">
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#9FD6D5] via-[#dff2f1] to-white shadow-[0_18px_40px_rgba(44,166,164,0.18)]">
          {profilePicturePreviewUrl ? (
            <img src={profilePicturePreviewUrl} alt="Profile preview" className="h-full w-full object-cover" />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-12 w-12 text-[#1E8C8A]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20a6 6 0 0 0-12 0" />
              <circle cx="12" cy="10" r="4" />
            </svg>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="edit-profile-picture"
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2CA6A4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(30,140,138,0.24)] transition hover:bg-[#1E8C8A]"
          >
            Upload Profile Picture
          </label>
          <input
            id="edit-profile-picture"
            type="file"
            accept="image/*"
            onChange={onProfilePictureChange}
            className="sr-only"
          />
        </div>

        {profilePictureFile ? (
          <p className="mt-2 text-xs text-slate-500">Selected file: {profilePictureFile.name}</p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Add or replace your photo from here.</p>
        )}
        <p className="mt-1 text-xs text-slate-500">Accepted image files only, up to 3MB.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            First Name
          </label>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Last Name
          </label>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Phone Number
          </label>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Phone Number 2 (Optional)
          </label>
          <input
            value={phoneNumber2}
            onChange={(event) => setPhoneNumber2(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
          Address
        </label>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            State of Origin
          </label>
          <select
            value={stateOfOrigin}
            onChange={(event) => setStateOfOrigin(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
            disabled={isLoadingStates}
          >
            <option value="">{isLoadingStates ? "Loading states..." : "Select state"}</option>
            {states.map((stateName) => (
              <option key={stateName} value={stateName}>
                {capitalizeWords(stateName)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Local Government Area (LGA)
          </label>
          <select
            value={lga}
            onChange={(event) => setLga(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
            required
            disabled={!stateOfOrigin || isLoadingLgas}
          >
            <option value="">
              {!stateOfOrigin ? "Select state first" : isLoadingLgas ? "Loading LGAs..." : "Select LGA"}
            </option>
            {lgas.map((lgaName) => (
              <option key={lgaName} value={lgaName}>
                {capitalizeWords(lgaName)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Education Level
          </label>
          <select
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          >
            <option value="">Select education level</option>
            {educationOptions.map((level) => (
              <option key={level} value={level}>
                {capitalizeWords(level)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Voice Part
          </label>
          <select
            value={voicePart}
            onChange={(event) => setVoicePart(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          >
            <option value="">Select voice part</option>
            {voicePartOptions.map((part) => (
              <option key={part} value={part}>
                {capitalizeWords(part)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
            Choir Level
          </label>
          <select
            value={choirLevel}
            onChange={(event) => setChoirLevel(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          >
            <option value="">Select choir level</option>
            {choirLevelOptions.map((level) => (
              <option key={level} value={level}>
                {capitalizeWords(level)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || isUploadingPicture}
        className="w-full rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isUploadingPicture ? "Uploading image..." : isSubmitting ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
