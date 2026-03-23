function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export function getClientVapidPublicKey() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export function getServerPushConfig() {
  const publicKey = getClientVapidPublicKey();
  const privateKey = normalizeEnvValue(process.env.VAPID_PRIVATE_KEY);
  const subject = normalizeEnvValue(process.env.VAPID_SUBJECT);

  return {
    publicKey,
    privateKey,
    subject,
    isConfigured: Boolean(publicKey && privateKey && subject),
  };
}

export function requireServerPushConfig() {
  const config = getServerPushConfig();

  if (!config.isConfigured) {
    throw new Error("Web push is not configured. Missing VAPID environment variables.");
  }

  return config;
}
