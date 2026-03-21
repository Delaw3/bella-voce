import { resolvePermissions } from "@/lib/user-config";
import { capitalizeWords } from "@/lib/utils";

type SerializableUser = {
  _id: { toString(): string };
  firstName: string;
  lastName: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  stateOfOrigin?: string;
  lga?: string;
  educationLevel?: string;
  voicePart?: string;
  choirLevel?: string;
  posts?: string[];
  post?: string | null;
  role: string;
  permissions?: string[];
  profilePicture?: string;
  onboardingCompleted?: boolean;
  status?: string;
  createdAt?: Date;
};

export function normalizeUserPosts(user: SerializableUser): string[] {
  if (user.posts?.length) return user.posts;
  if (user.post) return [user.post];
  return [];
}

export function serializeAdminMember(user: SerializableUser) {
  return {
    id: user._id.toString(),
    firstName: capitalizeWords(user.firstName),
    lastName: capitalizeWords(user.lastName),
    email: user.email ?? "",
    username: user.username ?? "",
    phoneNumber: user.phoneNumber ?? "",
    phoneNumber2: user.phoneNumber2 ?? "",
    address: user.address ?? "",
    stateOfOrigin: user.stateOfOrigin ?? "",
    lga: user.lga ?? "",
    educationLevel: user.educationLevel ?? "",
    voicePart: user.voicePart ?? "",
    choirLevel: user.choirLevel ?? "",
    posts: normalizeUserPosts(user),
    role: user.role,
    permissions: resolvePermissions(user.role as Parameters<typeof resolvePermissions>[0], user.permissions),
    profilePicture: user.profilePicture ?? "",
    onboardingCompleted: Boolean(user.onboardingCompleted),
    status: user.status ?? "ACTIVE",
    createdAt: user.createdAt?.toISOString?.() ?? "",
  };
}

export function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}
