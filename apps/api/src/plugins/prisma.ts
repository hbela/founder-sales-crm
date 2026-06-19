import type { FastifyInstance } from "fastify";
import { db } from "@founder-crm/db";

export async function prismaPlugin(app: FastifyInstance): Promise<void> {
  app.decorate("prisma", db);
  app.addHook("onClose", async () => {
    await db.$disconnect();
  });
}
