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
  UPSTREAM_BASE_URL: z.string().default("https://api.openai.com/v1"),
  UPSTREAM_API_KEY: z.string(),
  DEFAULT_MODEL: z.string().default("gpt-5.2-codex")
});

export const config = envSchema.parse(process.env);

export const pricingTable: Record<
  string,
  { input: number; output: number; cache?: number }
> = {
  "gpt-5.2-codex": { input: 10, output: 30, cache: 0 }
};
