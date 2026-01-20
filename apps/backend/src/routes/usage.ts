import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { adminAuth } from "../middleware/adminAuth.js";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

export async function registerUsageRoutes(app: FastifyInstance) {
  app.get(
    "/api/codexusage/summary",
    { preHandler: adminAuth },
    async (request) => {
      const query = querySchema.parse(request.query);
      const admin = await prisma.user.findFirstOrThrow({
        where: { email: "admin@codex.local" }
      });
      const total = await prisma.userUsageTotal.findUnique({
        where: { userId: admin.id }
      });
      const daily = query.from
        ? await prisma.userUsageDaily.findMany({
            where: {
              userId: admin.id,
              date: {
                gte: query.from,
                lte: query.to ?? query.from
              }
            }
          })
        : [];

      const calls = daily.reduce((sum, item) => sum + item.calls, 0);
      const costUsed = daily.reduce((sum, item) => sum + item.costUsd, 0);

      const key = await prisma.apiKey.findFirst({
        where: { userId: admin.id },
        orderBy: { createdAt: "desc" }
      });

      return {
        user_id: admin.id,
        calls: query.from ? calls : total?.calls ?? 0,
        cost_used: query.from ? costUsed : total?.costUsd ?? 0,
        daily_limit: key?.dailyUsdLimit ?? null,
        total_limit: key?.totalUsdLimit ?? null,
        expires_at: key?.expiresAt ?? null
      };
    }
  );

  app.get(
    "/api/codexusage/timeseries",
    { preHandler: adminAuth },
    async (request) => {
      const query = querySchema.parse(request.query);
      const admin = await prisma.user.findFirstOrThrow({
        where: { email: "admin@codex.local" }
      });

      const rows = await prisma.usageLog.findMany({
        where: {
          userId: admin.id,
          createdAt: {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined
          }
        }
      });

      const result: Record<string, Record<string, number>> = {};
      for (const row of rows) {
        const date = row.createdAt.toISOString().slice(0, 10);
        if (!result[row.model]) result[row.model] = {};
        result[row.model][date] = (result[row.model][date] ?? 0) + row.costUsd;
      }

      return result;
    }
  );

  app.get(
    "/api/codexusage/logs",
    { preHandler: adminAuth },
    async (request) => {
      const query = z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          page: z.coerce.number().default(1),
          pageSize: z.coerce.number().default(20)
        })
        .parse(request.query);
      const admin = await prisma.user.findFirstOrThrow({
        where: { email: "admin@codex.local" }
      });
      const where = {
        userId: admin.id,
        createdAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined
        }
      };
      const [total, logs] = await Promise.all([
        prisma.usageLog.count({ where }),
        prisma.usageLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize
        })
      ]);

      const cumulative = await prisma.userUsageTotal.findUnique({
        where: { userId: admin.id }
      });

      return {
        total,
        page: query.page,
        pageSize: query.pageSize,
        rows: logs.map((log) => ({
          id: log.id,
          tool: log.tool,
          channel: log.channel,
          model: log.model,
          created_at: log.createdAt,
          conversation_length: log.totalTokens,
          input_tokens: log.inputTokens,
          output_tokens: log.outputTokens,
          cache_tokens: log.cacheTokens,
          cost: log.costUsd,
          cumulative_cost: cumulative?.costUsd ?? 0
        }))
      };
    }
  );
}
