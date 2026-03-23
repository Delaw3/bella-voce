"use client";

import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import Image from "next/image";
import { useState } from "react";

type ProfileAvatarProps = {
  src?: string | null;
  alt: string;
  initials: string;
  size: number;
  className?: string;
  fallbackClassName?: string;
  imageOptions?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: "cover" | "contain" | "fill";
  };
};

export function ProfileAvatar({
  src,
  alt,
  initials,
  size,
  className = "",
  fallbackClassName = "",
  imageOptions,
}: ProfileAvatarProps) {
  const normalizedSrc = src?.trim() ?? "";
  const [failedSrc, setFailedSrc] = useState("");
  const hasImageError = Boolean(normalizedSrc) && failedSrc === normalizedSrc;

  if (!normalizedSrc || hasImageError) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-600 ${fallbackClassName}`}
        style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.28)) }}
      >
        {initials || "BV"}
      </div>
    );
  }

  return (
    <Image
      src={getOptimizedSupabaseImageUrl(normalizedSrc, {
        width: imageOptions?.width ?? size * 2,
        height: imageOptions?.height ?? size * 2,
        quality: imageOptions?.quality ?? 70,
        resize: imageOptions?.resize ?? "cover",
      })}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
