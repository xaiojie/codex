import { prisma } from "../db.js";
import { generateApiKey, getPrefix, hashKey } from "../utils/crypto.js";
import { toDateOrNull } from "../utils/time.js";

const keyFormat = /^sk-[a-f0-9]{60}$/i;

function isKeyFormatValid(value: string) {
  return keyFormat.test(value);
}

export async function createApiKey(params: {
  userId: string;
  name: string;
  scopes: Record<string, unknown>;
  dailyUsdLimit?: number | null;
  totalUsdLimit?: number | null;
  expiresAt?: string | null;
}) {
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const prefix = getPrefix(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: params.userId,
      name: params.name,
      prefix,
      keyHash,
      status: "active",
      scopes: params.scopes,
      dailyUsdLimit: params.dailyUsdLimit ?? null,
      totalUsdLimit: params.totalUsdLimit ?? null,
      expiresAt: toDateOrNull(params.expiresAt)
    }
  });

  return { apiKey, rawKey };
}

export async function regenerateApiKey(id: string) {
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const prefix = getPrefix(rawKey);

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      prefix,
      keyHash,
      lastUsedAt: null // Reset last used since it's effectively a new key
    }
  });

  return { apiKey, rawKey };
}

export async function getKeyByHash(keyHash: string) {
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true }
  });
}

export type KeyValidationResult = {
  valid: boolean;
  reason?: "invalid_format" | "invalid_api_key" | "disabled_api_key" | "expired_api_key";
};

export async function validateApiKey(rawKey: string): Promise<KeyValidationResult> {
  if (!isKeyFormatValid(rawKey)) {
    return { valid: false, reason: "invalid_format" };
  }

  const keyHash = hashKey(rawKey);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash }
  });

  if (!key) {
    return { valid: false, reason: "invalid_api_key" };
  }

  if (key.status !== "active") {
    return { valid: false, reason: "disabled_api_key" };
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return { valid: false, reason: "expired_api_key" };
  }

  return { valid: true };
}
