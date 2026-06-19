import type { FastifyInstance } from "fastify";
import { followupCreateSchema, followupUpdateSchema } from "@founder-crm/types";
import { logActivity } from "../../lib/activity.js";

export async function followupRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/followups", async (request) => {
    const { status, due } = request.query as { status?: string; due?: "today" | "overdue" };
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(due === "today" ? { status: "PENDING" as const, dueDate: { lte: endOfToday } } : {}),
      ...(due === "overdue" ? { status: "PENDING" as const, dueDate: { lt: now } } : {}),
    };

    return app.prisma.followUp.findMany({
      where,
      include: { contact: true },
      orderBy: { dueDate: "asc" },
      take: 200,
    });
  });

  app.post("/api/followups", async (request, reply) => {
    const data = followupCreateSchema.parse(request.body);
    const followup = await app.prisma.followUp.create({
      data: { contactId: data.contactId, dueDate: data.dueDate, note: data.note || null },
      include: { contact: true },
    });
    await logActivity(app.prisma, {
      contactId: data.contactId,
      type: "FOLLOWUP_DUE",
      description: `Follow-up scheduled for ${data.dueDate.toISOString().slice(0, 10)}`,
      authorId: request.user?.id,
      metadata: { followupId: followup.id, dueDate: data.dueDate },
    });
    return reply.code(201).send(followup);
  });

  app.patch("/api/followups/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = followupUpdateSchema.parse(request.body);
    const before = await app.prisma.followUp.findUnique({ where: { id } });
    if (!before) return reply.code(404).send({ error: "Follow-up not found" });

    const followup = await app.prisma.followUp.update({
      where: { id },
      data: {
        ...(data.completed ? { status: "COMPLETED" } : {}),
        ...(data.note !== undefined ? { note: data.note || null } : {}),
      },
      include: { contact: true },
    });

    if (data.completed && before.status === "PENDING") {
      await logActivity(app.prisma, {
        contactId: before.contactId,
        type: "FOLLOWUP_COMPLETED",
        description: `Follow-up completed`,
        authorId: request.user?.id,
        metadata: { followupId: id },
      });
    }

    return followup;
  });

  app.delete("/api/followups/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.followUp.delete({ where: { id } });
    return reply.code(204).send();
  });
}
