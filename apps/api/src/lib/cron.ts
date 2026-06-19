import cron from "node-cron";
import type { FastifyInstance } from "fastify";
import { processPendingOutreach } from "./outreach.js";

export function startScheduler(app: FastifyInstance): void {
  // Process the outreach queue every minute.
  cron.schedule("* * * * *", async () => {
    try {
      const sent = await processPendingOutreach(app.prisma);
      if (sent > 0) {
        app.log.info({ sent }, "outreach queue processed");
      }
    } catch (err) {
      app.log.error({ err }, "outreach scheduler error");
    }
  });

  app.log.info("Scheduler started (outreach queue every minute)");
}
