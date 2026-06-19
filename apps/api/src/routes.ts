import type { FastifyInstance } from "fastify";
import { authRoutes } from "./modules/auth/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { contactRoutes } from "./modules/contacts/routes.js";
import { campaignRoutes } from "./modules/campaigns/routes.js";
import { templateRoutes } from "./modules/templates/routes.js";
import { outreachRoutes } from "./modules/outreach/routes.js";
import { followupRoutes } from "./modules/followups/routes.js";
import { activityRoutes } from "./modules/activities/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Public routes
  await app.register(authRoutes);
  await app.register(webhookRoutes);

  // Protected routes
  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);
    await protectedApp.register(productRoutes);
    await protectedApp.register(contactRoutes);
    await protectedApp.register(campaignRoutes);
    await protectedApp.register(templateRoutes);
    await protectedApp.register(outreachRoutes);
    await protectedApp.register(followupRoutes);
    await protectedApp.register(activityRoutes);
    await protectedApp.register(dashboardRoutes);
  });
}
