import { ComplaintStatus } from "@/lib/complaint-config";
import type { ChoirPost, UserRole } from "@/lib/user-config";
import { ChoirFinanceType } from "@/types/dashboard";
import { NotificationItem } from "@/types/dashboard";

export type AccountabilityAdjustmentType = "PLEDGED" | "FINE" | "LEVY";

export type AdminMemberItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  educationLevel?: string;
  voicePart?: string;
  stateOfOrigin?: string;
  lga?: string;
  choirLevel?: string;
  posts?: string[];
  role: UserRole;
  permissions: string[];
  profilePicture?: string;
  onboardingCompleted: boolean;
  status?: string;
  createdAt?: string;
  totalOwed?: number;
};

export type AdminAccountabilityItem = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  role: UserRole;
  finance: {
    pledged: number;
    fine: number;
    levy: number;
    updatedAt?: string;
  };
};

export type AdminAccountabilityAdjustmentItem = {
  id: string;
  type: AccountabilityAdjustmentType;
  amount: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminExcuseItem = {
  id: string;
  subject: string;
  reason: string;
  excuseDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    voicePart?: string;
    profilePicture?: string;
  } | null;
};

export type AdminChoirFinanceItem = {
  id: string;
  type: ChoirFinanceType;
  amount: number;
  description: string;
  financeDate: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSongSelectionItem = {
  id: string;
  title: string;
  selectionDate: string;
  songs: Array<{ part: string; song: string; key: string }>;
  status: "IN_REVIEW" | "POSTED";
  createdAt: string;
  updatedAt: string;
};

export type AdminPsalmistItem = {
  id: string;
  assignmentDate: string;
  monthKey: string;
  year: number;
  month: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    voicePart?: string;
    profilePicture?: string;
  } | null;
};

export type AdminComplaintItem = {
  id: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  } | null;
};

export type AdminNotificationItem = NotificationItem & {
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export type UpdateRolePayload = {
  role: UserRole;
};

export type UpdatePostPayload = {
  posts: ChoirPost[];
};
