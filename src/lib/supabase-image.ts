type ResizeMode = "cover" | "contain" | "fill";

type SupabaseImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "origin" | "webp";
  resize?: ResizeMode;
};

export function getOptimizedSupabaseImageUrl(src?: string | null, options: SupabaseImageOptions = {}) {
  if (!src) {
    return "";
  }

  void options;
  return src;
}
