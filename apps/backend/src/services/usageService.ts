import { prisma } from "../db.js";
import { config, pricingTable } from "../config.js";
import { getDateKey } from "../utils/time.js";

export type UsageInput = {
  keyId: string;
  userId: string;
  requestId?: string | null;
  tool?: string | null;
  channel?: string | null;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
};

export function calculateCost(model: string, input: number, output: number, cache: number) {
  const pricing = pricingTable[model] ?? pricingTable[config.DEFAULT_MODEL];
  const inputCost = (input / 1_000_000) * pricing.input;
  const outputCost = (output / 1_000_000) * pricing.output;
  const cacheCost = (cache / 1_000_000) * (pricing.cache ?? 0);
  return Number((inputCost + outputCost + cacheCost).toFixed(6));
}

export async function recordUsage(input: UsageInput) {
  const costUsd = calculateCost(
    input.model,
    input.inputTokens,
    input.outputTokens,
    input.cacheTokens
  );
  const dateKey = getDateKey(config.TIMEZONE_OFFSET);

  await prisma.$transaction([
    prisma.usageLog.create({
      data: {
        keyId: input.keyId,
        userId: input.userId,
        requestId: input.requestId ?? undefined,
        tool: input.tool ?? undefined,
        channel: input.channel ?? undefined,
        model: input.model,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheTokens: input.cacheTokens,
        totalTokens: input.totalTokens,
        costUsd
      }
    }),
    prisma.userUsageDaily.upsert({
      where: { userId_date: { userId: input.userId, date: dateKey } },
      update: {
        calls: { increment: 1 },
        costUsd: { increment: costUsd },
        inputTokens: { increment: input.inputTokens },
        outputTokens: { increment: input.outputTokens },
        cacheTokens: { increment: input.cacheTokens },
        totalTokens: { increment: input.totalTokens }
      },
      create: {
        userId: input.userId,
        date: dateKey,
        calls: 1,
        costUsd,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheTokens: input.cacheTokens,
        totalTokens: input.totalTokens
      }
    }),
    prisma.userUsageTotal.upsert({
      where: { userId: input.userId },
      update: {
        calls: { increment: 1 },
        costUsd: { increment: costUsd },
        inputTokens: { increment: input.inputTokens },
        outputTokens: { increment: input.outputTokens },
        cacheTokens: { increment: input.cacheTokens },
        totalTokens: { increment: input.totalTokens }
      },
      create: {
        userId: input.userId,
        calls: 1,
        costUsd,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheTokens: input.cacheTokens,
        totalTokens: input.totalTokens
      }
    }),
    prisma.keyUsageDaily.upsert({
      where: { keyId_date: { keyId: input.keyId, date: dateKey } },
      update: {
        calls: { increment: 1 },
        costUsd: { increment: costUsd },
        inputTokens: { increment: input.inputTokens },
        outputTokens: { increment: input.outputTokens },
        cacheTokens: { increment: input.cacheTokens },
        totalTokens: { increment: input.totalTokens }
      },
      create: {
        keyId: input.keyId,
        userId: input.userId,
        date: dateKey,
        calls: 1,
        costUsd,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheTokens: input.cacheTokens,
        totalTokens: input.totalTokens
      }
    }),
    prisma.keyUsageTotal.upsert({
      where: { keyId: input.keyId },
      update: {
        calls: { increment: 1 },
        costUsd: { increment: costUsd },
        inputTokens: { increment: input.inputTokens },
        outputTokens: { increment: input.outputTokens },
        cacheTokens: { increment: input.cacheTokens },
        totalTokens: { increment: input.totalTokens }
      },
      create: {
        keyId: input.keyId,
        userId: input.userId,
        calls: 1,
        costUsd,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheTokens: input.cacheTokens,
        totalTokens: input.totalTokens
      }
    }),
    prisma.apiKey.update({
      where: { id: input.keyId },
      data: { lastUsedAt: new Date() }
    })
  ]);

  return costUsd;
}

export async function getKeyUsageTotals(keyId: string, dateKey: string) {
  const [daily, total] = await Promise.all([
    prisma.keyUsageDaily.findUnique({
      where: { keyId_date: { keyId, date: dateKey } }
    }),
    prisma.keyUsageTotal.findUnique({
      where: { keyId }
    })
  ]);

  return {
    dailyCost: daily?.costUsd ?? 0,
    totalCost: total?.costUsd ?? 0
  };
}
