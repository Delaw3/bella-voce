import { calculateUserAccountability, ensureMonthlyDuesForYear, ensureUserAdjustments } from "@/lib/accountability";
import { Types } from "mongoose";

type UserIdLike = string | Types.ObjectId;

export async function ensureUserFinance(userId: UserIdLike) {
  const result = await calculateUserAccountability(userId);
  return result.breakdown;
}

export async function ensureMonthlyDues(userId: UserIdLike, year: number) {
  return ensureMonthlyDuesForYear(userId, year);
}

export async function ensureUserAdjustmentsRecord(userId: UserIdLike) {
  return ensureUserAdjustments(userId);
}
