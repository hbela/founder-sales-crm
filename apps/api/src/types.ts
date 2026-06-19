import type { User, PrismaClient } from "@founder-crm/db";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    requireAuth: (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: User | null;
  }
}

export {};
