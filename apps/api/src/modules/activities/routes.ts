import type { FastifyInstance } from "fastify";

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/activities", async (request) => {
    const { contactId, type, limit } = request.query as { contactId?: string; type?: string; limit?: string };
    const take = Math.min(Number(limit ?? 50), 200);

    return app.prisma.activity.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take,
    });
  });
}
