import { getRedisClient } from "@/lib/redis";

export const CACHE_TTL = {
  adminDashboardSummary: 60,
  adminAnalytics: 90,
  adminMembersList: 90,
  adminNotificationsList: 60,
  adminPsalmistMonth: 90,
  adminPaymentAccountsList: 300,
  adminPaymentTransactions: 45,
  accountabilitySettings: 600,
  userDashboardSummary: 45,
  userNotifications: 45,
  userPsalmistMonth: 90,
  userProfile: 120,
  userMonthlyDues: 90,
  activePaymentAccounts: 300,
  userPaymentHistory: 90,
  userPaymentDetails: 90,
  userOutstandingPayments: 45,
} as const;

const loggedCacheErrors = new Set<string>();

function logCacheError(scope: string) {
  if (loggedCacheErrors.has(scope)) {
    return;
  }

  loggedCacheErrors.add(scope);
  console.warn(`[cache] ${scope} failed, falling back to database.`);
}

export async function cacheGet<T>(key: string) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch {
    logCacheError("read");
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch {
    logCacheError("write");
    return false;
  }
}

export async function cacheDelete(keys: string | string[]) {
  const redis = getRedisClient();
  const normalizedKeys = Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);

  if (!redis || normalizedKeys.length === 0) {
    return;
  }

  try {
    await redis.del(...normalizedKeys);
  } catch {
    logCacheError("delete");
  }
}

export async function cacheDeleteByPrefix(prefix: string) {
  const redis = getRedisClient();

  if (!redis || !prefix) {
    return;
  }

  try {
    const keys = await redis.keys(`${prefix}*`);

    if (Array.isArray(keys) && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    logCacheError("delete-prefix");
  }
}

export async function remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>) {
  const cached = await cacheGet<T>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
