import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

function getRealtimeAuthSecret() {
  const candidate =
    process.env.REALTIME_AUTH_SECRET ||
    process.env.VAPID_PRIVATE_KEY ||
    process.env.MONGODB_URI ||
    "";

  if (!candidate.trim()) {
    throw new Error("Realtime auth secret is not configured.");
  }

  return candidate.trim();
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", getRealtimeAuthSecret()).update(value).digest("base64url");
}

export function createRealtimeAuthToken(userId) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = encode(
    JSON.stringify({
      userId: String(userId),
      expiresAt,
    }),
  );
  const signature = sign(payload);
  const token = `${payload}.${signature}`;

  return {
    token,
    expiresAt,
  };
}

export function validateRealtimeAuthToken(token) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  let record;
  try {
    record = JSON.parse(decode(payload));
  } catch {
    return null;
  }

  if (!record?.userId || !record?.expiresAt || Number(record.expiresAt) <= Date.now()) {
    return null;
  }

  return {
    userId: record.userId,
    expiresAt: Number(record.expiresAt),
  };
}
