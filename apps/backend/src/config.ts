import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://redis:6379"),
  ADMIN_TOKEN: z.string(),
  TIMEZONE_OFFSET: z.string().default("+08:00"),
  RPM_LIMIT: z.coerce.number().default(60),
  TPM_LIMIT: z.coerce.number().default(60000),
  UPSTREAM_BASE_URL: z.string().default("https://api.gptsapi.net/v1"),
  UPSTREAM_API_KEY: z.string(),
  DEFAULT_MODEL: z.string().default("gpt-4o")
});

export const config = envSchema.parse(process.env);

export const pricingTable: Record<
  string,
  { input: number; output: number; cache?: number }
> = {
  // OpenAI
  "gpt-4o": { input: 5, output: 15, cache: 2.5 },
  "gpt-4o-2024-08-06": { input: 2.5, output: 10, cache: 1.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cache: 0.075 },
  "o1": { input: 15, output: 60, cache: 7.5 },
  "o1-mini": { input: 3, output: 12, cache: 1.5 },
  "gpt-4.1": { input: 5, output: 15, cache: 2.5 }, // Estimated
  "gpt-4.1-mini": { input: 0.15, output: 0.6, cache: 0.075 }, // Estimated
  "gpt-5": { input: 10, output: 30, cache: 5 }, // Estimated
  "gpt-5.2-codex": { input: 10, output: 30, cache: 0 },
  
  // Anthropic
  "claude-3-5-sonnet-20241022": { input: 3, output: 15, cache: 0.3 },
  "claude-3-opus-20240229": { input: 15, output: 75, cache: 1.5 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15, cache: 0.3 }, // Estimated
  "claude-opus-4-5-20251101": { input: 15, output: 75, cache: 1.5 }, // Estimated
  
  // Gemini
  "gemini-1.5-pro": { input: 3.5, output: 10.5, cache: 0.875 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3, cache: 0.01875 },
  "gemini-2.5-pro": { input: 3.5, output: 10.5, cache: 0.875 }, // Estimated
  "gemini-2.5-flash": { input: 0.075, output: 0.3, cache: 0.01875 }, // Estimated
};
