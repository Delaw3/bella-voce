"use client";

import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import Image from "next/image";

type ProfileImageViewerProps = {
  isOpen: boolean;
  imageUrl?: string;
  alt: string;
  onClose: () => void;
};

export function ProfileImageViewer({ isOpen, imageUrl, alt, onClose }: ProfileImageViewerProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1F2937]/75 p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image viewer"
          className="absolute top-3 right-3 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#9FD6D5] hover:text-[#1E8C8A]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          <Image
            src={getOptimizedSupabaseImageUrl(imageUrl, { width: 960, quality: 80, resize: "contain" })}
            alt={alt}
            width={640}
            height={640}
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
