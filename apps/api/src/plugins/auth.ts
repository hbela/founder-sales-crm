import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { readSessionUserId } from "../lib/auth.js";

export async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest("user", null);

  // Best-effort: load the current user on every request (null if not authed).
  app.addHook("onRequest", async (request: FastifyRequest) => {
    const userId = readSessionUserId(request);
    if (!userId) {
      request.user = null;
      return;
    }
    try {
      request.user = await app.prisma.user.findUnique({ where: { id: userId } });
    } catch {
      request.user = null;
    }
  });

  app.decorate(
    "requireAuth",
    async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      if (!request.user) {
        await reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
}
