import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  authSecret: required("AUTH_SECRET", "dev-secret-change-me"),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "fscrm_session",
  webUrl: process.env.WEB_URL ?? "http://localhost:5173",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
  replyToEmail: process.env.REPLY_TO_EMAIL ?? "",
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
  glmApiKey: process.env.GLM_API_KEY ?? "",
  glmBaseUrl: process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4/",
  glmModel: process.env.GLM_MODEL ?? "glm-5.2",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@foundercrm.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "admin123",
  seedAdminName: process.env.SEED_ADMIN_NAME ?? "Founder",
};

export const isDev = env.nodeEnv !== "production";
