import type { FastifyInstance } from "fastify";
import { campaignCreateSchema, campaignUpdateSchema } from "@founder-crm/types";

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/campaigns", async (request) => {
    const { productId, status } = request.query as { productId?: string; status?: string };
    return app.prisma.campaign.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        product: true,
        _count: { select: { outreach: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/api/campaigns", async (request, reply) => {
    const data = campaignCreateSchema.parse(request.body);
    const campaign = await app.prisma.campaign.create({
      data: {
        ...data,
        targetMarket: data.targetMarket || null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
      },
      include: { product: true },
    });
    return reply.code(201).send(campaign);
  });

  app.get("/api/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await app.prisma.campaign.findUnique({
      where: { id },
      include: { product: true, _count: { select: { outreach: true } } },
    });
    if (!campaign) return reply.code(404).send({ error: "Campaign not found" });
    return campaign;
  });

  app.patch("/api/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = campaignUpdateSchema.parse(request.body);
    const campaign = await app.prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        ...(data.targetMarket !== undefined ? { targetMarket: data.targetMarket || null } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ?? null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ?? null } : {}),
      },
      include: { product: true },
    });
    return campaign;
  });

  app.delete("/api/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.campaign.delete({ where: { id } });
    return reply.code(204).send();
  });
}
