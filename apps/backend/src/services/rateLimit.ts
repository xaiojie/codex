import { redis } from "./redis.js";
import { config } from "../config.js";

export async function checkRateLimit(
  keyId: string,
  estimatedTokens: number
) {
  const now = Date.now();
  const windowKey = Math.floor(now / 60000);
  const rpmKey = `rl:${keyId}:rpm:${windowKey}`;
  const tpmKey = `rl:${keyId}:tpm:${windowKey}`;

  const pipeline = redis.pipeline();
  pipeline.incr(rpmKey);
  pipeline.expire(rpmKey, 120);
  pipeline.incrby(tpmKey, estimatedTokens);
  pipeline.expire(tpmKey, 120);
  const results = await pipeline.exec();

  const rpm = Number(results?.[0]?.[1] ?? 0);
  const tpm = Number(results?.[2]?.[1] ?? 0);

  if (rpm > config.RPM_LIMIT) {
    return { allowed: false, reason: "rate_limit_rpm" };
  }
  if (tpm > config.TPM_LIMIT) {
    return { allowed: false, reason: "rate_limit_tpm" };
  }

  return { allowed: true, reason: "ok" };
}
