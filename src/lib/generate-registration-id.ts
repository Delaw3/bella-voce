import { randomInt } from "crypto";

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateRegistrationId(): string {
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += ALPHANUMERIC[randomInt(0, ALPHANUMERIC.length)];
  }

  return `BV-${suffix}`;
}
