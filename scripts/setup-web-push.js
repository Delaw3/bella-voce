const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");
const envExamplePath = path.join(rootDir, ".env.example");

const VAPID_PUBLIC_KEY = "NEXT_PUBLIC_VAPID_PUBLIC_KEY";
const VAPID_PRIVATE_KEY = "VAPID_PRIVATE_KEY";
const VAPID_SUBJECT = "VAPID_SUBJECT";

function readFileIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const trimmed = content.replace(/\s+$/, "");
  return `${trimmed}${trimmed ? "\n" : ""}${line}\n`;
}

function deriveSubject(content) {
  const emailMatch = content.match(/^EMAIL_USER=(.+)$/m);
  if (emailMatch?.[1]) {
    return `mailto:${emailMatch[1].trim().replace(/^["']|["']$/g, "")}`;
  }

  return "mailto:admin@bellavoce.app";
}

const keys = webpush.generateVAPIDKeys();
const existingLocalEnv = readFileIfExists(envLocalPath);
const subject = deriveSubject(existingLocalEnv);

let nextLocalEnv = existingLocalEnv;
nextLocalEnv = upsertEnvValue(nextLocalEnv, VAPID_PUBLIC_KEY, keys.publicKey);
nextLocalEnv = upsertEnvValue(nextLocalEnv, VAPID_PRIVATE_KEY, keys.privateKey);
nextLocalEnv = upsertEnvValue(nextLocalEnv, VAPID_SUBJECT, subject);
fs.writeFileSync(envLocalPath, nextLocalEnv, "utf8");

const existingExampleEnv = readFileIfExists(envExamplePath);
let nextExampleEnv = existingExampleEnv;
nextExampleEnv = upsertEnvValue(nextExampleEnv, VAPID_PUBLIC_KEY, "");
nextExampleEnv = upsertEnvValue(nextExampleEnv, VAPID_PRIVATE_KEY, "");
nextExampleEnv = upsertEnvValue(nextExampleEnv, VAPID_SUBJECT, "mailto:admin@example.com");
fs.writeFileSync(envExamplePath, nextExampleEnv, "utf8");

console.log("Web push VAPID keys generated and env files updated.");
