import {
  ALL_PERMISSIONS,
  CHOIR_POSTS,
  ChoirPost,
  PermissionKey,
  USER_ROLES,
  USER_STATUSES,
  UserRole,
  UserStatus,
} from "@/lib/user-config";
import { DUE_MONTH_NUMBERS, DueMonthNumber } from "@/lib/monthly-dues";
import { Model, Schema, model, models } from "mongoose";

export const EDUCATION_LEVELS = [
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
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const VOICE_PARTS = ["soprano", "alto", "tenor", "bass"] as const;
export type VoicePart = (typeof VOICE_PARTS)[number];

export const CHOIR_LEVELS = ["member", "probation"] as const;
export type ChoirLevel = (typeof CHOIR_LEVELS)[number];

export type UserRecord = {
  firstName: string;
  lastName: string;
  email: string;
  uniqueId: string;
  username: string;
  password: string;
  phoneNumber?: string;
  phoneNumber2?: string;
  address?: string;
  stateOfOrigin?: string;
  lga?: string;
  educationLevel?: EducationLevel;
  voicePart?: VoicePart;
  choirLevel: ChoirLevel;
  profilePicture?: string;
  posts: ChoirPost[];
  post?: ChoirPost | null;
  onboardingCompleted: boolean;
  role: UserRole;
  permissions: PermissionKey[];
  status: UserStatus;
  monthlyDuesStartYear?: number;
  removedMonthlyDuesMonths: DueMonthNumber[];
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserRecord>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    uniqueId: { type: String, required: true, unique: true },
    username: { type: String, required: true, trim: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, trim: true },
    phoneNumber2: { type: String, trim: true },
    address: { type: String, trim: true },
    stateOfOrigin: { type: String, trim: true },
    lga: { type: String, trim: true },
    educationLevel: { type: String, trim: true, enum: EDUCATION_LEVELS },
    voicePart: { type: String, trim: true, lowercase: true, enum: VOICE_PARTS },
    choirLevel: { type: String, trim: true, lowercase: true, enum: CHOIR_LEVELS, default: "member" },
    profilePicture: { type: String },
    posts: { type: [String], enum: CHOIR_POSTS, default: [] },
    post: { type: String, enum: CHOIR_POSTS, default: null, select: false },
    onboardingCompleted: { type: Boolean, default: false },
    role: { type: String, enum: USER_ROLES, default: "USER" },
    permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
    status: { type: String, enum: USER_STATUSES, default: "ACTIVE" },
    monthlyDuesStartYear: { type: Number },
    removedMonthlyDuesMonths: { type: [Number], enum: DUE_MONTH_NUMBERS, default: [] },
  },
  { timestamps: true },
);

const existingUserModel = models.User as Model<UserRecord> | undefined;

function getExistingPermissionEnumValues() {
  if (!existingUserModel) return [] as string[];

  try {
    const permissionsPath = existingUserModel.schema.path("permissions") as unknown as
      | { caster?: { enumValues?: string[] } }
      | undefined;
    const caster = permissionsPath?.caster;
    return Array.isArray(caster?.enumValues) ? caster.enumValues : [];
  } catch {
    return [] as string[];
  }
}

const existingPermissionEnumValues = getExistingPermissionEnumValues();

if (
  existingUserModel &&
  (!existingPermissionEnumValues.includes("accountability_items.view") ||
    !existingPermissionEnumValues.includes("probation_members.view") ||
    !existingPermissionEnumValues.includes("waitlist.view") ||
    !existingPermissionEnumValues.includes("waitlist.create") ||
    !existingPermissionEnumValues.includes("payments.approve") ||
    !existingPermissionEnumValues.includes("payment_accounts.view") ||
    !existingUserModel.schema.path("monthlyDuesStartYear") ||
    !existingUserModel.schema.path("removedMonthlyDuesMonths"))
) {
  delete models.User;
}

const User =
  existingUserModel &&
  existingPermissionEnumValues.includes("accountability_items.view") &&
  existingPermissionEnumValues.includes("probation_members.view") &&
  existingPermissionEnumValues.includes("waitlist.view") &&
  existingPermissionEnumValues.includes("waitlist.create") &&
  existingPermissionEnumValues.includes("payments.approve") &&
  existingPermissionEnumValues.includes("payment_accounts.view") &&
  existingUserModel.schema.path("monthlyDuesStartYear") &&
  existingUserModel.schema.path("removedMonthlyDuesMonths")
    ? existingUserModel
    : model<UserRecord>("User", userSchema);

export default User;
