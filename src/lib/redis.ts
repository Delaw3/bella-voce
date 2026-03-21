import { Redis } from "@upstash/redis";

declare global {
  var bellaVoceRedis: Redis | null | undefined;
}

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

const redisUrl = normalizeEnvValue(process.env.UPSTASH_REDIS_REST_URL);
const redisToken = normalizeEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);

export const isRedisConfigured = Boolean(redisUrl && redisToken);

export function getRedisClient() {
  if (!isRedisConfigured) {
    return null;
  }

  if (globalThis.bellaVoceRedis !== undefined) {
    return globalThis.bellaVoceRedis;
  }

  globalThis.bellaVoceRedis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  return globalThis.bellaVoceRedis;
}
