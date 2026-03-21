export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function capitalizeWords(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDisplayName(firstName?: string, lastName?: string): string {
  return [capitalizeWords(firstName ?? ""), capitalizeWords(lastName ?? "")]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function formatInitials(firstName?: string, lastName?: string): string {
  return `${capitalizeWords(firstName ?? "").charAt(0)}${capitalizeWords(lastName ?? "").charAt(0)}` || "?";
}

export function formatChoirPost(post?: string): string {
  const normalized = capitalizeWords(post ?? "");

  if (normalized === "Auxiliary Choirmaster") {
    return "Aux Choirmaster";
  }

  return normalized;
}

export function isGoldChoirPost(post?: string): boolean {
  const normalized = formatChoirPost(post);
  return normalized === "President" || normalized === "Choirmaster" || normalized === "Aux Choirmaster";
}

export function formatAppDate(value: string | Date): string {
  const date = new Date(value);

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAppTime(value: string | Date): string {
  const date = new Date(value);

  return date.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatAppDateTime(value: string | Date): string {
  return `${formatAppDate(value)} ${formatAppTime(value)}`;
}
