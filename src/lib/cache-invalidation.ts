import { cacheDelete, cacheDeleteByPrefix } from "@/lib/cache";
import { cacheKeys, cachePrefixes } from "@/lib/cache-keys";

export async function invalidateUserDashboardCache(userId: string) {
  await cacheDeleteByPrefix(cachePrefixes.userDashboard(userId));
}

export async function invalidateUserNotificationsCache(userId: string) {
  await Promise.all([
    cacheDeleteByPrefix(cachePrefixes.userNotifications(userId)),
    invalidateUserDashboardCache(userId),
  ]);
}

export async function invalidateUserPsalmistCache(userId: string) {
  await cacheDeleteByPrefix(cachePrefixes.userPsalmist(userId));
}

export async function invalidatePsalmistMonthCaches() {
  await cacheDeleteByPrefix(cachePrefixes.psalmist());
}

export async function invalidateUserProfileCache(userId: string) {
  await cacheDelete(cacheKeys.userProfile(userId));
}

export async function invalidateUserPaymentCaches(userId: string) {
  await Promise.all([
    cacheDeleteByPrefix(cachePrefixes.userPayments(userId)),
    cacheDeleteByPrefix(cachePrefixes.userMonthlyDues(userId)),
    invalidateUserDashboardCache(userId),
  ]);
}

export async function invalidateUserReadCaches(userId: string) {
  await Promise.all([
    invalidateUserProfileCache(userId),
    invalidateUserNotificationsCache(userId),
    invalidateUserPaymentCaches(userId),
  ]);
}

export async function invalidateAllUserReadCaches() {
  await cacheDeleteByPrefix(cachePrefixes.userRoot());
}

export async function invalidatePaymentAccountCaches() {
  await Promise.all([
    cacheDeleteByPrefix(cachePrefixes.paymentAccounts()),
    cacheDeleteByPrefix(cachePrefixes.adminPaymentAccounts()),
  ]);
}

export async function invalidateAdminDashboardCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminDashboard());
}

export async function invalidateAdminAnalyticsCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminAnalytics());
}

export async function invalidateAdminMembersCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminMembers());
}

export async function invalidateAdminNotificationsCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminNotifications());
}

export async function invalidateAdminPsalmistCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminPsalmist());
}

export async function invalidateAdminPaymentsCache() {
  await cacheDeleteByPrefix(cachePrefixes.adminPayments());
}

export async function invalidateAccountabilitySettingsCache() {
  await cacheDeleteByPrefix(cachePrefixes.accountabilitySettings());
}

export async function invalidateAdminSummaryCaches() {
  await Promise.all([invalidateAdminDashboardCache(), invalidateAdminAnalyticsCache()]);
}
