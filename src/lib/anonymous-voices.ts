import {
  MAX_ANONYMOUS_MESSAGE_LENGTH,
  MIN_ANONYMOUS_MESSAGE_LENGTH,
  SUBMISSION_COOLDOWN_SECONDS,
  type AnonymousMessageItem,
} from "@/lib/anonymous-voices/client";
import { connectToDatabase } from "@/lib/mongodb";
import { notifyManyUsers } from "@/lib/push-notifications";
import { getRedisClient } from "@/lib/redis";
import { resolvePermissions } from "@/lib/user-config";
import { AnonymousMessageRecord } from "@/models/anonymous-message.model";
import AnonymousVoiceLink, { AnonymousVoiceLinkRecord } from "@/models/anonymous-voice-link.model";
import AnonymousVoicesSettings, { AnonymousVoicesSettingsRecord } from "@/models/anonymous-voices-settings.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { createHash, randomBytes } from "crypto";

// The pure, client-safe constants, types and Lagos date helpers now live in
// "@/lib/anonymous-voices/client" so client components never pull in this
// server-only module (mongoose, mongodb, redis, push notifications).
// They are re-exported here so existing server-side imports keep working.
export {
  ANONYMOUS_MESSAGE_STATUSES,
  MAX_ANONYMOUS_MESSAGE_LENGTH,
  MIN_ANONYMOUS_MESSAGE_LENGTH,
  SUBMISSION_COOLDOWN_SECONDS,
  evaluateSubmissionSchedule,
  formatLagosDateTime,
  parseLagosDateTime,
  toLagosDateTimeInputString,
} from "@/lib/anonymous-voices/client";
export type {
  AnonymousMessageItem,
  AnonymousMessageStatus,
  AnonymousVoicesPublicStatus,
  AnonymousVoicesScheduleStatus,
  AnonymousVoicesSettingsDTO,
} from "@/lib/anonymous-voices/client";

// In-memory rate limiting map for environments where Redis is not configured
const inMemoryRateLimits = new Map<string, number>();

/**
 * Validates message length and content.
 */
export function validateAnonymousMessage(input: unknown):
  | { ok: true; message: string }
  | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "A message is required." };
  }

  const trimmed = input.trim();
  if (trimmed.length < MIN_ANONYMOUS_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Your message must be at least ${MIN_ANONYMOUS_MESSAGE_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_ANONYMOUS_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Your message cannot exceed ${MAX_ANONYMOUS_MESSAGE_LENGTH} characters.`,
    };
  }

  return { ok: true, message: trimmed };
}

/**
 * Checks rate limiting for an authenticated user without ever storing identity with the message.
 */
export async function checkAnonymousRateLimit(userId: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  if (!userId) {
    return { allowed: false, retryAfterSeconds: SUBMISSION_COOLDOWN_SECONDS };
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `ratelimit:anon_voices:${userId}`;
      const result = await redis.set(key, "1", { nx: true, ex: SUBMISSION_COOLDOWN_SECONDS });
      if (result === null) {
        return { allowed: false, retryAfterSeconds: SUBMISSION_COOLDOWN_SECONDS };
      }
      return { allowed: true };
    } catch {
      // Fall through to in-memory check if Redis fails
    }
  }

  // In-memory fallback
  const now = Date.now();
  const lastTime = inMemoryRateLimits.get(userId);
  if (lastTime && now - lastTime < SUBMISSION_COOLDOWN_SECONDS * 1000) {
    const remaining = Math.ceil((SUBMISSION_COOLDOWN_SECONDS * 1000 - (now - lastTime)) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  inMemoryRateLimits.set(userId, now);

  // Periodic cleanup of stale in-memory entries
  if (inMemoryRateLimits.size > 2000) {
    const cutoff = now - 60000;
    for (const [key, timestamp] of inMemoryRateLimits.entries()) {
      if (timestamp < cutoff) {
        inMemoryRateLimits.delete(key);
      }
    }
  }

  return { allowed: true };
}

/**
 * Serializes an anonymous message document to a clean client DTO.
 * Explicitly excludes any sender identity or sensitive metadata.
 */
export function serializeAnonymousMessage(
  doc: AnonymousMessageRecord & { _id: mongoose.Types.ObjectId },
): AnonymousMessageItem {
  return {
    id: doc._id.toString(),
    message: doc.message,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

/**
 * Retrieves the singleton Anonymous Voices settings document.
 */
export async function getOrCreateAnonymousVoicesSettings(): Promise<AnonymousVoicesSettingsRecord> {
  await connectToDatabase();
  const existing = await AnonymousVoicesSettings.findOne({ key: "default" }).lean();
  if (existing) {
    return existing as AnonymousVoicesSettingsRecord;
  }

  const created = await AnonymousVoicesSettings.create({
    key: "default",
    enabled: false,
    opensAt: null,
    closesAt: null,
  });

  return created.toObject() as AnonymousVoicesSettingsRecord;
}

/**
 * Updates the singleton Anonymous Voices settings document.
 */
export async function updateAnonymousVoicesSettingsRecord(
  payload: {
    enabled: boolean;
    opensAt: Date | null;
    closesAt: Date | null;
  },
  actorUserId?: string,
): Promise<AnonymousVoicesSettingsRecord> {
  await connectToDatabase();
  const updated = await AnonymousVoicesSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        enabled: payload.enabled,
        opensAt: payload.opensAt,
        closesAt: payload.closesAt,
        ...(actorUserId ? { updatedBy: new mongoose.Types.ObjectId(actorUserId) } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return updated as AnonymousVoicesSettingsRecord;
}

// ---------------------------------------------------------------------------
// Public shareable link (two-way: app members + anyone with the link)
// The same singleton link record is reused until the admin regenerates it.
// Only the SHA-256 hash of the token is stored; the raw token only ever
// appears inside the URL handed to the admin.
// ---------------------------------------------------------------------------

export function hashAnonymousLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAnonymousLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export type AnonymousLinkInfo = {
  isActive: boolean;
  label: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function serializeAnonymousLink(doc: AnonymousVoiceLinkRecord | null): AnonymousLinkInfo | null {
  if (!doc || !doc.isActive) return null;
  return {
    isActive: doc.isActive,
    label: doc.label ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

/**
 * Returns the active public link record, or null when none exists / revoked.
 */
export async function getActiveAnonymousLink(): Promise<AnonymousVoiceLinkRecord | null> {
  await connectToDatabase();
  const existing = await AnonymousVoiceLink.findOne({ key: "default", isActive: true }).lean();
  return (existing as AnonymousVoiceLinkRecord | null) ?? null;
}

/**
 * Creates (or rotates) the singleton public link. The old token stops
 * working immediately. Returns the RAW token once — it is never stored.
 */
export async function regenerateAnonymousLink(
  actorUserId?: string,
): Promise<{ token: string; record: AnonymousVoiceLinkRecord }> {
  await connectToDatabase();
  const token = generateAnonymousLinkToken();
  const tokenHash = hashAnonymousLinkToken(token);

  const updated = await AnonymousVoiceLink.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        tokenHash,
        isActive: true,
        revokedAt: null,
        ...(actorUserId ? { createdBy: new mongoose.Types.ObjectId(actorUserId) } : {}),
      },
      $setOnInsert: { key: "default" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return { token, record: updated as AnonymousVoiceLinkRecord };
}

/**
 * Resolves a raw URL token to its active link record. Null = invalid/revoked.
 */
export async function resolveAnonymousLinkToken(token: string): Promise<AnonymousVoiceLinkRecord | null> {
  if (!token || typeof token !== "string" || token.length < 20) return null;
  await connectToDatabase();
  const tokenHash = hashAnonymousLinkToken(token);
  const existing = await AnonymousVoiceLink.findOne({
    key: "default",
    tokenHash,
    isActive: true,
  }).lean();
  return (existing as AnonymousVoiceLinkRecord | null) ?? null;
}

// In-memory fallback for public (IP-based) rate limits when Redis is absent.
const inMemoryPublicRateLimits = new Map<string, number>();

/**
 * IP-based rate limit for link submissions (no login available).
 * Mirrors the 30s app cooldown per sender.
 */
export async function checkAnonymousPublicRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  const key = ip?.trim() ? ip.trim().slice(0, 80) : "unknown";

  const redis = getRedisClient();
  if (redis) {
    try {
      const redisKey = `ratelimit:anon_voices:public:${key}`;
      const result = await redis.set(redisKey, "1", { nx: true, ex: SUBMISSION_COOLDOWN_SECONDS });
      if (result === null) {
        return { allowed: false, retryAfterSeconds: SUBMISSION_COOLDOWN_SECONDS };
      }
      return { allowed: true };
    } catch {
      // Fall through to in-memory check if Redis fails
    }
  }

  const now = Date.now();
  const lastTime = inMemoryPublicRateLimits.get(key);
  if (lastTime && now - lastTime < SUBMISSION_COOLDOWN_SECONDS * 1000) {
    const remaining = Math.ceil((SUBMISSION_COOLDOWN_SECONDS * 1000 - (now - lastTime)) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  inMemoryPublicRateLimits.set(key, now);

  if (inMemoryPublicRateLimits.size > 5000) {
    const cutoff = now - 60000;
    for (const [mapKey, timestamp] of inMemoryPublicRateLimits.entries()) {
      if (timestamp < cutoff) {
        inMemoryPublicRateLimits.delete(mapKey);
      }
    }
  }

  return { allowed: true };
}

/**
 * Notifies authorized administrators of a new anonymous submission WITHOUT
 * exposing any sender information or user identity.
 */
export async function notifyAdminsOfAnonymousSubmission(messageId: string): Promise<void> {
  try {
    await connectToDatabase();
    const adminUsers = await User.find({
      role: { $in: ["ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    })
      .select("_id role permissions")
      .lean();

    const recipientIds = new Set<string>();

    for (const adminUser of adminUsers) {
      if (adminUser.role === "SUPER_ADMIN") {
        recipientIds.add(adminUser._id.toString());
        continue;
      }

      const resolved = resolvePermissions(adminUser.role, adminUser.permissions);
      if (resolved.includes("anonymous_voices.view")) {
        recipientIds.add(adminUser._id.toString());
      }
    }

    if (recipientIds.size === 0) {
      return;
    }

    await notifyManyUsers(
      [...recipientIds].map((recipientId) => ({
        userId: recipientId,
        title: "Anonymous Voice Received",
        message: "A new anonymous message has been submitted.",
        type: "INFO" as const,
        route: "/admin/anonymous-voices",
        metadata: {
          itemId: messageId,
          itemType: "anonymous_voice",
        },
        dedupeKey: `admin-activity:anonymous_voice:${messageId}:${recipientId}`,
      })),
    );
  } catch {
    // Non-blocking notification failure
  }
}
