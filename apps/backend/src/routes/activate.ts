import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { createApiKey } from "../services/keyService.js";
import { sendOpenAIError } from "../utils/errors.js";

const schema = z.object({
  cardCode: z.string().min(1)
});

export async function registerActivateRoute(app: FastifyInstance) {
  app.post("/api/activate", async (request, reply) => {
    const body = schema.parse(request.body);
    const card = await prisma.cardCode.findUnique({
      where: { code: body.cardCode }
    });
    if (!card) {
      return sendOpenAIError(reply, 404, "Invalid card code", "card_error", "card_invalid");
    }
    if (card.status !== "unused") {
      return sendOpenAIError(reply, 409, "Card code already used", "card_error", "card_used");
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      return sendOpenAIError(reply, 410, "Card code expired", "card_error", "card_expired");
    }

    const admin = await prisma.user.findFirstOrThrow({
      where: { email: "admin@codex.local" }
    });

    const { apiKey, rawKey } = await createApiKey({
      userId: admin.id,
      name: `Card ${card.code}`,
      scopes: { mode: "codex-only" },
      dailyUsdLimit: 5,
      totalUsdLimit: 20
    });

    await prisma.cardCode.update({
      where: { code: card.code },
      data: { status: "used", boundKeyId: apiKey.id }
    });

    return reply.send({ apiKey: rawKey, apiId: apiKey.id });
  });
}
