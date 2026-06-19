import type { FastifyInstance } from "fastify";
import { outreachCreateSchema, outreachBulkCreateSchema } from "@founder-crm/types";
import { processOutreachItem } from "../../lib/outreach.js";

export async function outreachRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/outreach", async (request) => {
    const { status, campaignId } = request.query as { status?: string; campaignId?: string };
    return app.prisma.outreach.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(campaignId ? { campaignId } : {}),
      },
      include: { contact: true, campaign: true, template: true },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    });
  });

  app.post("/api/outreach", async (request, reply) => {
    const data = outreachCreateSchema.parse(request.body);
    const item = await app.prisma.outreach.create({
      data: {
        contactId: data.contactId,
        campaignId: data.campaignId,
        templateId: data.templateId,
        scheduledAt: data.scheduledAt ?? new Date(),
      },
      include: { contact: true, campaign: true, template: true },
    });
    return reply.code(201).send(item);
  });

  app.post("/api/outreach/bulk", async (request, reply) => {
    const data = outreachBulkCreateSchema.parse(request.body);
    const scheduledAt = data.scheduledAt ?? new Date();
    const created = await app.prisma.$transaction(
      data.contactIds.map((contactId) =>
        app.prisma.outreach.create({
          data: { contactId, campaignId: data.campaignId, templateId: data.templateId, scheduledAt },
        }),
      ),
    );
    return reply.code(201).send({ created: created.length });
  });

  app.patch("/api/outreach/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { scheduledAt?: string };
    const item = await app.prisma.outreach.update({
      where: { id },
      data: { ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}) },
    });
    return item;
  });

  app.delete("/api/outreach/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await app.prisma.outreach.findUnique({ where: { id } });
    if (!item) return reply.code(404).send({ error: "Not found" });
    if (item.status !== "PENDING") {
      return reply.code(409).send({ error: "Only pending items can be cancelled" });
    }
    await app.prisma.outreach.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.post("/api/outreach/:id/send", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await processOutreachItem(app.prisma, id);
    if (!result.success) {
      return reply.code(422).send({ error: result.error ?? "Send failed" });
    }
    return reply.send({ ok: true });
  });
}
