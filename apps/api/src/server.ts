import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import "./types.js";
import { env, isDev } from "./env.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { authPlugin } from "./plugins/auth.js";
import { errorPlugin } from "./plugins/error.js";
import { registerRoutes } from "./routes.js";
import { startScheduler } from "./lib/cron.js";

const app = Fastify({
  logger: {
    level: isDev ? "info" : "warn",
  },
});

await app.register(cookie, {});
await app.register(cors, {
  origin: [env.webUrl],
  credentials: true,
});

// Call setup functions directly on the root instance so decorations
// (prisma, requireAuth) land on root and are inherited by route scopes.
await prismaPlugin(app);
await authPlugin(app);
await errorPlugin(app);

app.get("/health", async () => ({
  status: "ok",
  service: "founder-sales-crm-api",
  time: new Date().toISOString(),
}));

await registerRoutes(app);

startScheduler(app);

app.listen({ port: env.port, host: "0.0.0.0" }).then(() => {
  app.log.info(`API ready on http://localhost:${env.port}`);
});

process.on("SIGTERM", async () => {
  app.log.info("SIGTERM received, shutting down");
  await app.close();
  process.exit(0);
});
