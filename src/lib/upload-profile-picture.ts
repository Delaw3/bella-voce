import { getSupabaseClient } from "@/lib/supabase";

const PROFILE_PICTURE_BUCKET = "bella-voce";
const PROFILE_PICTURE_PREFIX = "profile-picture";

function getFileExtension(file: File): string {
  const nameExtension = file.name.split(".").pop()?.trim().toLowerCase();
  const cleanedNameExtension = nameExtension?.replace(/[^a-z0-9]/g, "");

  if (cleanedNameExtension) {
    return cleanedNameExtension;
  }

  const mimeSubtype = file.type.split("/").pop()?.trim().toLowerCase();
  const cleanedMimeSubtype = mimeSubtype?.replace(/[^a-z0-9]/g, "");
  return cleanedMimeSubtype || "bin";
}

export type UploadedProfilePicture = {
  filePath: string;
  publicUrl: string;
};

export async function uploadProfilePicture(file: File, userId: string): Promise<UploadedProfilePicture> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("Missing user ID for profile picture upload.");
  }

  const supabase = getSupabaseClient();
  const extension = getFileExtension(file);
  const filePath = `${PROFILE_PICTURE_PREFIX}/${trimmedUserId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(PROFILE_PICTURE_BUCKET).upload(filePath, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });

  if (uploadError) {
    const rawMessage = uploadError.message || "";
    if (rawMessage.toLowerCase().includes("row-level security")) {
      throw new Error(
        "Upload is blocked by Supabase Storage policy. Please enable insert/select access for bella-voce/profile-picture files.",
      );
    }
    throw new Error(rawMessage || "Unable to upload profile picture.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_PICTURE_BUCKET).getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error("Unable to generate profile picture URL.");
  }

  return { filePath, publicUrl };
}
