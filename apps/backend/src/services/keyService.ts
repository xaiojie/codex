import { prisma } from "../db.js";
import { generateApiKey, getPrefix, hashKey } from "../utils/crypto.js";
import { toDateOrNull } from "../utils/time.js";

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

export async function getKeyByHash(keyHash: string) {
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true }
  });
}
