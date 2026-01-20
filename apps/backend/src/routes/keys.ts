import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { createApiKey, regenerateApiKey, validateApiKey } from "../services/keyService.js";
import { adminAuth } from "../middleware/adminAuth.js";

const createSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["all", "openai", "anthropic", "gemini"]).default("all"),
  dailyUsdLimit: z.number().nullable().optional(),
  totalUsdLimit: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional()
});

const updateSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  scopes: z.record(z.any()).optional(),
  dailyUsdLimit: z.number().nullable().optional(),
  totalUsdLimit: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional()
});

const testSchema = z.object({
  apiKey: z.string().min(1)
});

export async function registerKeyRoutes(app: FastifyInstance) {
  app.post("/api/keys", { preHandler: adminAuth }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const admin = await prisma.user.findFirstOrThrow({
      where: { email: "admin@codex.local" }
    });
    const result = await createApiKey({
      userId: admin.id,
      name: body.name,
      scopes: { provider: body.provider },
      dailyUsdLimit: body.dailyUsdLimit ?? null,
      totalUsdLimit: body.totalUsdLimit ?? null,
      expiresAt: body.expiresAt ?? null
    });
    return reply.send({
      id: result.apiKey.id,
      prefix: result.apiKey.prefix,
      name: result.apiKey.name,
      scopes: result.apiKey.scopes,
      dailyUsdLimit: result.apiKey.dailyUsdLimit,
      totalUsdLimit: result.apiKey.totalUsdLimit,
      expiresAt: result.apiKey.expiresAt,
      status: result.apiKey.status,
      apiKey: result.rawKey
    });
  });

  app.post("/api/keys/test", { preHandler: adminAuth }, async (request, reply) => {
    const body = testSchema.parse(request.body);
    const result = await validateApiKey(body.apiKey);
    return reply.send({ valid: result.valid, reason: result.reason });
  });

  app.get("/api/keys", { preHandler: adminAuth }, async () => {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" }
    });
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      scopes: key.scopes,
      dailyUsdLimit: key.dailyUsdLimit,
      totalUsdLimit: key.totalUsdLimit,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt
    }));
  });

  app.patch("/api/keys/:id", { preHandler: adminAuth }, async (request, reply) => {
    const body = updateSchema.parse(request.body);
    const { id } = request.params as { id: string };
    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        status: body.status,
        scopes: body.scopes,
        dailyUsdLimit: body.dailyUsdLimit,
        totalUsdLimit: body.totalUsdLimit,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
      }
    });
    return reply.send({
      id: updated.id,
      name: updated.name,
      prefix: updated.prefix,
      status: updated.status,
      scopes: updated.scopes,
      dailyUsdLimit: updated.dailyUsdLimit,
      totalUsdLimit: updated.totalUsdLimit,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt
    });
  });

  app.post("/api/keys/:id/regenerate", { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await regenerateApiKey(id);
    return reply.send({
      id: result.apiKey.id,
      prefix: result.apiKey.prefix,
      name: result.apiKey.name,
      scopes: result.apiKey.scopes,
      dailyUsdLimit: result.apiKey.dailyUsdLimit,
      totalUsdLimit: result.apiKey.totalUsdLimit,
      expiresAt: result.apiKey.expiresAt,
      status: result.apiKey.status,
      apiKey: result.rawKey
    });
  });

  app.delete("/api/keys/:id", { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.apiKey.delete({ where: { id } });
    return reply.send({ success: true });
  });
}
