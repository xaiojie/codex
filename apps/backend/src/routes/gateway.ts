import { FastifyInstance } from "fastify";
import { request } from "undici";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { hashKey } from "../utils/crypto.js";
import { sendOpenAIError } from "../utils/errors.js";
import { getDateKey } from "../utils/time.js";
import { checkRateLimit } from "../services/rateLimit.js";
import { getKeyUsageTotals, recordUsage } from "../services/usageService.js";

function estimateTokens(payload: unknown) {
  const text = JSON.stringify(payload ?? {});
  return Math.ceil(text.length / 4);
}

function extractApiKey(headers: Record<string, string | string[] | undefined>) {
  const auth = headers.authorization ?? headers.Authorization;
  if (!auth) return null;
  const value = Array.isArray(auth) ? auth[0] : auth;
  const match = value.match(/Bearer\s+(.+)/i);
  return match ? match[1] : null;
}

function parseUsage(responseBody: any) {
  const usage = responseBody?.usage ?? {};
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;
  const cacheTokens =
    usage.cached_tokens ??
    usage.cache_tokens ??
    usage.input_tokens_cached ??
    usage.prompt_tokens_cached ??
    0;
  return { inputTokens, outputTokens, cacheTokens, totalTokens };
}

function detectTool(responseBody: any) {
  const outputs = responseBody?.output ?? [];
  if (!Array.isArray(outputs)) return null;
  for (const item of outputs) {
    const toolName = item?.name ?? item?.tool_name;
    if (toolName) return toolName;
  }
  return null;
}

export async function registerGatewayRoutes(app: FastifyInstance) {
  async function handler(requestPayload: any, headers: Record<string, string | string[] | undefined>, reply: any) {
    const apiKey = extractApiKey(headers);
    if (!apiKey) {
      return sendOpenAIError(reply, 401, "Missing API key", "auth_error", "missing_api_key");
    }

    const keyHash = hashKey(apiKey);
    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true }
    });

    if (!key || key.status !== "active") {
      return sendOpenAIError(reply, 401, "Invalid API key", "auth_error", "invalid_api_key");
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return sendOpenAIError(reply, 403, "API key expired", "auth_error", "expired_api_key");
    }

    if (key.scopes && typeof key.scopes === "object") {
      const scopeMode = (key.scopes as any).mode;
      if (scopeMode === "codex-only") {
        const model = requestPayload?.model ?? config.DEFAULT_MODEL;
        if (!String(model).includes("codex")) {
          return sendOpenAIError(reply, 403, "Scope restricted to codex models", "scope_error", "scope_restricted");
        }
      }
    }

    const estimatedTokens = estimateTokens(requestPayload);
    const rateResult = await checkRateLimit(key.id, estimatedTokens);
    if (!rateResult.allowed) {
      return sendOpenAIError(reply, 429, "Rate limit exceeded", "rate_limit_error", rateResult.reason);
    }

    const dateKey = getDateKey(config.TIMEZONE_OFFSET);
    const totals = await getKeyUsageTotals(key.id, dateKey);
    if (key.dailyUsdLimit && totals.dailyCost >= key.dailyUsdLimit) {
      return sendOpenAIError(reply, 402, "Daily quota exceeded", "quota_error", "daily_quota_exceeded");
    }
    if (key.totalUsdLimit && totals.totalCost >= key.totalUsdLimit) {
      return sendOpenAIError(reply, 402, "Total quota exceeded", "quota_error", "total_quota_exceeded");
    }

    if (requestPayload?.stream) {
      return sendOpenAIError(reply, 400, "Streaming is not supported in this gateway", "invalid_request_error", "stream_not_supported");
    }

    const upstreamUrl = `${config.UPSTREAM_BASE_URL.replace(/\/$/, "")}/responses`;
    const started = Date.now();

    const upstreamResponse = await request(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.UPSTREAM_API_KEY}`
      },
      body: JSON.stringify(requestPayload)
    });

    const responseBody = await upstreamResponse.body.json();
    const latencyMs = Date.now() - started;

    if (upstreamResponse.statusCode >= 400) {
      return reply.status(upstreamResponse.statusCode).send(responseBody);
    }

    const usage = parseUsage(responseBody);
    const model = responseBody?.model ?? requestPayload?.model ?? config.DEFAULT_MODEL;
    const tool = detectTool(responseBody);
    const requestId = responseBody?.id ?? null;

    await recordUsage({
      keyId: key.id,
      userId: key.userId,
      requestId,
      tool,
      channel: "gateway",
      model,
      latencyMs,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheTokens: usage.cacheTokens,
      totalTokens: usage.totalTokens
    });

    return reply.send(responseBody);
  }

  app.post("/openai/v1/responses", async (request, reply) => {
    return handler(request.body, request.headers, reply);
  });

  app.post("/openai/responses", async (request, reply) => {
    return handler(request.body, request.headers, reply);
  });
}
