import { createHash, randomBytes } from "crypto";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const random = randomBytes(30).toString("hex");
  return `sk-${random}`;
}

export function getPrefix(key: string) {
  return key.slice(0, 8);
}
